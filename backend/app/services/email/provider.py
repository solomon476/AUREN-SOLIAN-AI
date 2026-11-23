"""Email Provider Abstraction Interface for AUREN SOLIAN."""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from app.models.email import (
    EmailMessage,
    EmailSendRequest,
    EmailSendResult,
    EmailProviderStatus,
)


class EmailProviderInterface(ABC):
    """Abstract Base Class for email providers (SMTP, Google Workspace, Microsoft 365, or Disconnected)."""

    @abstractmethod
    def get_status(self) -> EmailProviderStatus:
        """Returns honest connection status and capabilities."""
        pass

    @abstractmethod
    async def send_email(
        self,
        request: EmailSendRequest,
        sender_email: str,
        sender_name: str,
    ) -> EmailSendResult:
        """Sends an email message through the provider."""
        pass

    @abstractmethod
    async def fetch_messages(
        self,
        folder: str,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[EmailMessage], int]:
        """Fetches messages from the provider folder."""
        pass

