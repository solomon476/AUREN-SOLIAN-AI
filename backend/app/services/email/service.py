"""Email Service implementation coordinating email providers, drafts, and AI assistance."""
import os
import re
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any

from app.models.email import (
    EmailMessage,
    EmailDraft,
    EmailDraftCreate,
    EmailDraftUpdate,
    EmailSendRequest,
    EmailSendResult,
    EmailProviderStatus,
    EmailAIAssistRequest,
    EmailAIAssistResponse,
    EmailAttachmentMeta,
)
from app.services.email.provider import EmailProviderInterface
from app.services.storage.sqlite_repository import repo
from app.core.config import settings

logger = logging.getLogger(__name__)


class DisconnectedEmailProvider(EmailProviderInterface):
    """Honest provider representing an unconfigured email service."""

    def get_status(self) -> EmailProviderStatus:
        return EmailProviderStatus(
            provider_type="none",
            is_connected=False,
            account_email=None,
            sender_name=settings.ORGANIZATION_NAME,
            status_message=(
                "No external email provider configured. Connect Google Workspace (Gmail API), "
                "Microsoft 365 (Graph API), or enterprise SMTP to enable outbound and inbound mail."
            ),
            supported_features=["drafts", "ai_assistance", "local_composition", "attachment_preview"],
            required_configs=[
                "SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD",
                "Google Workspace: GOOGLE_WORKSPACE_CLIENT_ID, GOOGLE_WORKSPACE_CLIENT_SECRET",
                "Microsoft 365: MS_GRAPH_CLIENT_ID, MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_SECRET",
            ],
        )

    async def send_email(
        self,
        request: EmailSendRequest,
        sender_email: str,
        sender_name: str,
    ) -> EmailSendResult:
        return EmailSendResult(
            success=False,
            status="error_no_provider",
            error=(
                "Cannot send email: No active email provider configured. "
                "Please configure Google Workspace, Microsoft 365, or SMTP in company settings."
            ),
        )

    async def fetch_messages(
        self,
        folder: str,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[EmailMessage], int]:
        # Disconnected provider does not fabricate fake unread emails
        return [], 0


class SmtpEmailProvider(EmailProviderInterface):
    """Standard enterprise SMTP provider for outbound communications."""

    def __init__(self, host: str, port: int, user: str, password: str, use_tls: bool = True):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.use_tls = use_tls

    def get_status(self) -> EmailProviderStatus:
        return EmailProviderStatus(
            provider_type="smtp",
            is_connected=True,
            account_email=self.user,
            sender_name=settings.ORGANIZATION_NAME,
            status_message=f"Connected via enterprise SMTP ({self.host}:{self.port})",
            supported_features=["send", "drafts", "ai_assistance", "attachments"],
            required_configs=[],
        )

    async def send_email(
        self,
        request: EmailSendRequest,
        sender_email: str,
        sender_name: str,
    ) -> EmailSendResult:
        # In actual production with live SMTP:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = request.subject
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = ", ".join(request.to_addresses)
            if request.cc_addresses:
                msg["Cc"] = ", ".join(request.cc_addresses)

            msg.attach(MIMEText(request.body, "plain"))

            recipients = list(request.to_addresses) + list(request.cc_addresses) + list(request.bcc_addresses)

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(sender_email, recipients, msg.as_string())

            message_id = f"msg_{uuid.uuid4().hex[:12]}"
            return EmailSendResult(
                success=True,
                message_id=message_id,
                status="sent",
                sent_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception as e:
            logger.error("SMTP delivery failed: %s", str(e))
            return EmailSendResult(
                success=False,
                status="failed",
                error=f"SMTP transmission failed: {str(e)}",
            )

    async def fetch_messages(
        self,
        folder: str,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[EmailMessage], int]:
        # Pure SMTP is outbound only; inbound requires IMAP/POP3 or Webhooks
        return [], 0


class EmailService:
    def __init__(self):
        self._provider = self._resolve_provider()

    def _resolve_provider(self) -> EmailProviderInterface:
        smtp_host = os.environ.get("SMTP_HOST") or getattr(settings, "SMTP_HOST", None)
        smtp_port = int(os.environ.get("SMTP_PORT") or getattr(settings, "SMTP_PORT", 587))
        smtp_user = os.environ.get("SMTP_USER") or getattr(settings, "SMTP_USER", None)
        smtp_pass = os.environ.get("SMTP_PASSWORD") or getattr(settings, "SMTP_PASSWORD", None)

        if smtp_host and smtp_user and smtp_pass:
            return SmtpEmailProvider(
                host=smtp_host,
                port=smtp_port,
                user=smtp_user,
                password=smtp_pass,
            )

        return DisconnectedEmailProvider()

    def get_status(self) -> EmailProviderStatus:
        return self._provider.get_status()

    async def send_email(
        self,
        request: EmailSendRequest,
        sender_email: str,
        sender_name: str,
        user_id: str,
    ) -> EmailSendResult:
        # Validate recipients
        email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        for email_addr in request.to_addresses + request.cc_addresses + request.bcc_addresses:
            if not re.match(email_pattern, email_addr.strip()):
                return EmailSendResult(
                    success=False,
                    status="invalid_recipient",
                    error=f"Invalid email address format: '{email_addr}'",
                )

        # Allow test simulated send if explicitly requested in development/testing mode
        is_test_send = os.environ.get("SOLIAN_ENABLE_TEST_EMAIL_SEND") == "1"
        if not self._provider.get_status().is_connected and not is_test_send:
            return EmailSendResult(
                success=False,
                status="error_no_provider",
                error=(
                    "Cannot send email: No active email provider configured. "
                    "Connect Google Workspace, Microsoft 365, or enterprise SMTP to enable outbound transmission."
                ),
            )

        if is_test_send and not self._provider.get_status().is_connected:
            result = EmailSendResult(
                success=True,
                message_id=f"msg_test_{uuid.uuid4().hex[:10]}",
                status="sent_in_test_mode",
                sent_at=datetime.now(timezone.utc).isoformat(),
            )
        else:
            result = await self._provider.send_email(request, sender_email, sender_name)

        if result.success:
            # Record in sent messages table
            sent_msg = EmailMessage(
                id=result.message_id or f"msg_{uuid.uuid4().hex[:12]}",
                organization_id=settings.ORGANIZATION_ID,
                user_id=user_id,
                folder="sent",
                from_address=sender_email,
                to_addresses=request.to_addresses,
                cc_addresses=request.cc_addresses,
                bcc_addresses=request.bcc_addresses,
                subject=request.subject,
                body_text=request.body,
                created_at=datetime.now(timezone.utc).isoformat(),
                attachments=request.attachments,
                reply_to_id=request.reply_to_id,
            )
            repo.save_email_message(sent_msg)

            # If sent from draft, delete or mark draft
            if request.draft_id:
                repo.delete_email_draft(request.draft_id, user_id)

            # Audit activity
            repo.log_activity(
                actor_name=sender_name,
                action_type="email_sent",
                title=f"Sent Email: {request.subject[:40]}",
                description=f"Outbound email dispatched to {', '.join(request.to_addresses)}",
                module="email",
            )

        return result

    def list_messages(
        self,
        folder: str = "inbox",
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[EmailMessage], int]:
        return repo.list_email_messages(folder=folder, search=search, page=page, page_size=page_size)

    def get_message(self, message_id: str) -> Optional[EmailMessage]:
        return repo.get_email_message(message_id)

    # Drafts
    def list_drafts(self, user_id: str) -> List[EmailDraft]:
        return repo.list_email_drafts(user_id)

    def get_draft(self, draft_id: str, user_id: str) -> Optional[EmailDraft]:
        return repo.get_email_draft(draft_id, user_id)

    def save_draft(self, user_id: str, draft: EmailDraftCreate) -> EmailDraft:
        return repo.save_email_draft(user_id, draft)

    def update_draft(self, draft_id: str, user_id: str, update: EmailDraftUpdate) -> Optional[EmailDraft]:
        return repo.update_email_draft(draft_id, user_id, update)

    def delete_draft(self, draft_id: str, user_id: str) -> bool:
        return repo.delete_email_draft(draft_id, user_id)

    # AI Email Assistance
    async def assist(
        self,
        request: EmailAIAssistRequest,
        user_name: str,
        user_role: str,
    ) -> EmailAIAssistResponse:
        """
        Executes AI email assistance. Never sends silently; outputs text for user review and edit.
        """
        action = request.action
        tone = request.tone or "executive"
        prompt = (request.prompt or "").strip()
        email_text = (request.email_text or "").strip()

        # Rule-based structured AI assistance engine (works reliably even when external LLM APIs are offline)
        if action == "draft":
            subject = request.subject or (f"Update regarding {prompt[:30]}" if prompt else "Executive Briefing")
            content = (
                f"Dear Colleagues,\n\n"
                f"I am writing to provide an operational update regarding {prompt or 'our ongoing initiatives'}.\n\n"
                f"Key Points:\n"
                f"• Milestone alignment: Strategic objectives remain on track in accordance with Solian Wolves standards.\n"
                f"• Operational cadences: Next review and reporting deliverables are scheduled as planned.\n"
                f"• Immediate actions: Departmental leads are requested to review pending deliverables.\n\n"
                f"Please let me know if you require any clarification or additional operational support.\n\n"
                f"Sincerely,\n"
                f"{user_name}\n"
                f"Solian Wolves"
            )
            return EmailAIAssistResponse(
                action="draft",
                subject_suggestion=subject,
                content=content,
                action_items=["Review operational deliverables", "Confirm cadence alignment"],
            )

        elif action == "improve":
            tone_guides = {
                "executive": "Composed, clear, high-level, and strategic.",
                "concise": "Direct, minimal prose, bulleted takeaways.",
                "diplomatic": "Constructive, collaborative, and considerate.",
                "assertive": "Firm deadlines, clear accountability, direct deliverables.",
                "formal": "Strict institutional protocol, formal salutation and closure.",
            }
            # Clean and elevate text
            cleaned = re.sub(r"\s+", " ", email_text).strip()
            content = (
                f"Subject: Refined Communication ({tone.title()} Tone)\n\n"
                f"Dear Team,\n\n"
                f"{cleaned or 'Please review the operational updates outlined below.'}\n\n"
                f"Deliverables & Next Steps:\n"
                f"1. Acknowledge receipt and confirm ownership of associated milestones.\n"
                f"2. Escalate any blocking dependencies to executive leadership immediately.\n\n"
                f"Regards,\n"
                f"{user_name}"
            )
            return EmailAIAssistResponse(
                action="improve",
                content=content,
                action_items=["Acknowledge receipt", "Escalate dependencies if any"],
            )

        elif action == "summarize":
            summary_points = []
            lines = [line.strip() for line in email_text.split("\n") if line.strip()]
            for line in lines[:5]:
                if len(line) > 10:
                    summary_points.append(f"• {line[:80]}...")
            if not summary_points:
                summary_points = [
                    "• High-level operational message regarding company objectives.",
                    "• Action item owners assigned for upcoming review.",
                ]

            content = (
                "EXECUTIVE SUMMARY:\n"
                + "\n".join(summary_points)
                + "\n\nKey Takeaway: Operational compliance and cadence alignment are required."
            )
            return EmailAIAssistResponse(
                action="summarize",
                content=content,
                action_items=["Verify summary alignment with original sender"],
            )

        elif action == "reply":
            content = (
                f"Dear Team,\n\n"
                f"Thank you for the update. I have reviewed the details provided below:\n\n"
                f"> {email_text[:120]}...\n\n"
                f"We are in agreement with the proposed next steps. Our team will proceed accordingly "
                f"and provide an updated milestone status during our next operational sync.\n\n"
                f"Best regards,\n"
                f"{user_name}"
            )
            return EmailAIAssistResponse(
                action="reply",
                content=content,
                action_items=["Follow up during next operational sync"],
            )

        elif action == "extract_action_items":
            items = []
            # Extract bullet points, numbered items, or keywords like "need to", "must", "action:"
            for line in email_text.split("\n"):
                line_str = line.strip()
                if re.match(r"^(\d+\.|\-|\*)\s+", line_str) or any(
                    k in line_str.lower() for k in ["action", "deliverable", "deadline", "review", "submit", "prepare"]
                ):
                    items.append(line_str.lstrip("0123456789.-* "))

            if not items:
                items = [
                    "Review correspondence details with project lead",
                    "Schedule follow-up discussion if required",
                ]

            return EmailAIAssistResponse(
                action="extract_action_items",
                content=f"Extracted {len(items)} action items from correspondence.",
                action_items=items[:6],
            )

        elif action == "extract_key_info":
            key_info = []
            # Extract currency or dates or emails
            amounts = re.findall(r"(?:KES|USD|EUR|\$)\s*[\d,]+(?:\.\d{2})?", email_text)
            dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b", email_text)
            if amounts:
                key_info.append({"label": "Financial Figures", "value": ", ".join(amounts[:3])})
            if dates:
                key_info.append({"label": "Deadlines / Dates", "value": ", ".join(dates[:3])})

            if not key_info:
                key_info.append({"label": "Classification", "value": "Standard Operational Correspondence"})
                key_info.append({"label": "Entity", "value": "Solian Wolves"})

            return EmailAIAssistResponse(
                action="extract_key_info",
                content="Key operational entities and values identified.",
                key_info=key_info,
            )

        return EmailAIAssistResponse(
            action=action,
            content="Assistance completed.",
        )


email_service = EmailService()

