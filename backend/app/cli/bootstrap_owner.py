#!/usr/bin/env python3
"""
AUREN SOLIAN — Statutory Company Owner Bootstrap CLI

Provides a secure, authoritative pathway for the company owner (Ian Momanyi Nyakundi)
to initialize, claim, and activate their executive administrator account.

Usage:
    # 1. Check bootstrap status and generate secure one-time activation link:
    python3 -m app.cli.bootstrap_owner

    # 2. Or directly bind a verified Supabase Auth UID:
    python3 -m app.cli.bootstrap_owner --bind-uid "<SUPABASE_AUTH_UID>"
"""
import sys
import argparse
from app.services.storage.sqlite_repository import repo
from app.core.security import UserRole


def main():
    parser = argparse.ArgumentParser(description="Authoritative Owner Account Bootstrap Utility")
    parser.add_argument("--bind-uid", type=str, help="Bind a specific Supabase Auth UID directly to the Owner account")
    parser.add_argument("--force-reissue", action="store_true", help="Reissue a fresh bootstrap token if pending")
    args = parser.parse_args()

    status = repo.get_owner_bootstrap_status()
    owner_id = status.get("owner_id")
    owner_name = status.get("owner_name")
    owner_email = status.get("owner_email")

    print("=" * 70)
    print("  AUREN SOLIAN — STATUTORY OWNER BOOTSTRAP UTILITY")
    print("=" * 70)
    print(f"  Owner Record:      {owner_name} ({owner_id})")
    print(f"  Official Email:    {owner_email}")
    print(f"  System Authority:  ROLE_OWNER (Executive Governance & Superuser)")

    if status.get("is_bootstrapped"):
        print(f"  Bootstrap Status:  ACTIVE & BOUND")
        print("=" * 70)
        print("\n[OK] The statutory Company Owner account is already initialized and active.")
        print("     Sign in normally through the web application using your corporate email and password.")
        sys.exit(0)

    print(f"  Bootstrap Status:  PENDING INITIALIZATION")
    print("=" * 70)

    if args.bind_uid:
        auth_uid = args.bind_uid.strip()
        print(f"\n[*] Binding Auth UID '{auth_uid}' directly to Owner record '{owner_id}'...")
        token = repo.get_or_create_owner_bootstrap_token(expires_in_days=3)
        try:
            owner = repo.bootstrap_owner(token, auth_uid)
            print(f"[SUCCESS] Owner account successfully initialized and bound!")
            print(f"          Owner: {owner.name} ({owner.email})")
            print(f"          Status: {owner.activation_status.upper()}")
            sys.exit(0)
        except Exception as e:
            print(f"[ERROR] Failed to bind Auth UID: {e}")
            sys.exit(1)

    # Generate or retrieve token
    if args.force_reissue:
        token, _ = repo.generate_member_invitation(owner_id, expires_in_days=3)
    else:
        token = repo.get_or_create_owner_bootstrap_token(expires_in_days=3)

    local_url = f"http://localhost:5173/?bootstrap_token={token}"
    prod_url = f"https://ren-solian-ai.vercel.app/?bootstrap_token={token}"

    print("\n[+] AUTHORIZATION BOOTSTRAP TOKEN GENERATED:")
    print(f"    Token: {token}\n")
    print("  To activate the Owner account, choose either:")
    print("  1. Open the web application and enter the token in the 'Activate Invitation' tab:")
    print(f"     -> Production: {prod_url}")
    print(f"     -> Local Dev:   {local_url}")
    print("\n  2. Or if you have created your Supabase user and have their UUID, bind directly:")
    print(f"     python3 -m app.cli.bootstrap_owner --bind-uid <SUPABASE_AUTH_UID>\n")
    print("=" * 70)


if __name__ == "__main__":
    main()

