"""Enterprise tests for Phase 4: Financial Intelligence & Company Records."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, UserRole
from app.services.storage.sqlite_repository import repo


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def owner_headers():
    token = create_access_token(data={"sub": "usr-1", "role": UserRole.OWNER.value, "org": "org-solian-wolves"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token(data={"sub": "usr-2", "role": UserRole.ADMIN.value, "org": "org-solian-wolves"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def member_headers():
    token = create_access_token(data={"sub": "usr-5", "role": UserRole.MEMBER.value, "org": "org-solian-wolves"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def guest_headers():
    token = create_access_token(data={"sub": "usr-6", "role": UserRole.GUEST.value, "org": "org-solian-wolves"})
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# 1. Financial Accounts
# =============================================================================
def test_list_financial_accounts(client, guest_headers):
    res = client.get("/api/v1/finance/accounts", headers=guest_headers)
    assert res.status_code == 200
    accounts = res.json()
    assert len(accounts) >= 3
    names = {a["name"] for a in accounts}
    assert "KCB Corporate Operational Account" in names
    assert "Safaricom M-Pesa Business Till" in names
    assert "Executive Petty Cash Safe" in names


def test_create_and_update_financial_account(client, admin_headers, member_headers):
    # Member cannot create account (RBAC)
    payload = {
        "name": "Stanbic Escrow Holding",
        "account_type": "bank",
        "account_number": "•••• 7712",
        "currency": "KES",
        "opening_balance": 1000000.0,
        "description": "Escrow reserve holding account",
    }
    res_forbidden = client.post("/api/v1/finance/accounts", json=payload, headers=member_headers)
    assert res_forbidden.status_code == 403

    # Admin can create account
    res = client.post("/api/v1/finance/accounts", json=payload, headers=admin_headers)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Stanbic Escrow Holding"
    assert created["currentBalance"] == 1000000.0
    account_id = created["id"]

    # Admin can update account
    update_payload = {"name": "Stanbic Escrow Holding (Tier 1)"}
    res_patch = client.patch(f"/api/v1/finance/accounts/{account_id}", json=update_payload, headers=admin_headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["name"] == "Stanbic Escrow Holding (Tier 1)"


# =============================================================================
# 2. Transactions & Atomic Balance Reconciliation
# =============================================================================
def test_transaction_flow_income_expense_transfer(client, admin_headers):
    # Fetch initial balances
    res_accs = client.get("/api/v1/finance/accounts", headers=admin_headers)
    accs = {a["id"]: a for a in res_accs.json()}
    kcb_id = "acc-kcb-01"
    mpesa_id = "acc-mpesa-01"

    kcb_initial = accs[kcb_id]["currentBalance"]
    mpesa_initial = accs[mpesa_id]["currentBalance"]

    # 1. Income into KCB
    inc_payload = {
        "transaction_type": "income",
        "date": "2026-11-22",
        "description": "Enterprise Retainer Payment",
        "amount": 250000.0,
        "currency": "KES",
        "account_id": kcb_id,
        "category": "Client Revenue",
        "payment_method": "bank_transfer",
    }
    res_inc = client.post("/api/v1/finance/transactions", json=inc_payload, headers=admin_headers)
    assert res_inc.status_code == 201
    inc_tx = res_inc.json()
    assert inc_tx["amount"] == 250000.0

    # Verify KCB balance increased atomically
    res_kcb = client.get(f"/api/v1/finance/accounts/{kcb_id}", headers=admin_headers)
    assert res_kcb.json()["currentBalance"] == kcb_initial + 250000.0

    # 2. Expense from KCB
    exp_payload = {
        "transaction_type": "expense",
        "date": "2026-11-22",
        "description": "Server Hardware Maintenance",
        "amount": 50000.0,
        "currency": "KES",
        "account_id": kcb_id,
        "category": "Hardware",
        "payment_method": "bank_transfer",
    }
    res_exp = client.post("/api/v1/finance/transactions", json=exp_payload, headers=admin_headers)
    assert res_exp.status_code == 201
    res_kcb2 = client.get(f"/api/v1/finance/accounts/{kcb_id}", headers=admin_headers)
    assert res_kcb2.json()["currentBalance"] == kcb_initial + 250000.0 - 50000.0

    # 3. Transfer from KCB to M-Pesa Till
    trf_payload = {
        "transaction_type": "transfer",
        "date": "2026-11-22",
        "description": "Till Top-up for Field Logistics",
        "amount": 80000.0,
        "currency": "KES",
        "account_id": kcb_id,
        "destination_account_id": mpesa_id,
        "category": "Internal Transfer",
        "payment_method": "bank_transfer",
    }
    res_trf = client.post("/api/v1/finance/transactions", json=trf_payload, headers=admin_headers)
    assert res_trf.status_code == 201
    trf_tx = res_trf.json()

    # Verify source decreased and destination increased
    res_kcb3 = client.get(f"/api/v1/finance/accounts/{kcb_id}", headers=admin_headers)
    res_mpesa = client.get(f"/api/v1/finance/accounts/{mpesa_id}", headers=admin_headers)
    assert res_kcb3.json()["currentBalance"] == kcb_initial + 250000.0 - 50000.0 - 80000.0
    assert res_mpesa.json()["currentBalance"] == mpesa_initial + 80000.0

    # 4. Reverse the transfer
    res_rev = client.post(
        f"/api/v1/finance/transactions/{trf_tx['id']}/reverse",
        json={"reason": "Incorrect transfer allocation"},
        headers=admin_headers,
    )
    assert res_rev.status_code == 200
    assert res_rev.json()["status"] == "reversed"

    # Verify balances reverted
    res_kcb4 = client.get(f"/api/v1/finance/accounts/{kcb_id}", headers=admin_headers)
    res_mpesa2 = client.get(f"/api/v1/finance/accounts/{mpesa_id}", headers=admin_headers)
    assert res_kcb4.json()["currentBalance"] == kcb_initial + 250000.0 - 50000.0
    assert res_mpesa2.json()["currentBalance"] == mpesa_initial


# =============================================================================
# 3. Invoices (Receivables & Revenue)
# =============================================================================
def test_invoice_creation_and_payment_reconciliation(client, admin_headers):
    import uuid
    uniq = uuid.uuid4().hex[:6]
    invoice_payload = {
        "invoice_number": f"INV-TEST-{uniq}",
        "client_id": "c-1",
        "client_name": "Meridian Global Logistics",
        "issue_date": "2026-11-20",
        "due_date": "2026-12-20",
        "items": [
            {"description": "Autonomous Telemetry Gateway Pilot", "quantity": 1.0, "unit_price": 500000.0, "subtotal": 500000.0},
            {"description": "Integration Engineering SLA", "quantity": 2.0, "unit_price": 100000.0, "subtotal": 200000.0},
        ],
        "tax_rate": 16.0,
        "currency": "KES",
        "notes": "Standard commercial terms Net 30",
    }
    res_inv = client.post("/api/v1/finance/invoices", json=invoice_payload, headers=admin_headers)
    assert res_inv.status_code == 201
    inv = res_inv.json()
    assert inv["subtotal"] == 700000.0
    assert inv["taxAmount"] == 112000.0
    assert inv["totalAmount"] == 812000.0
    assert inv["balanceDue"] == 812000.0
    assert inv["status"] == "issued"
    inv_id = inv["id"]

    # Record partial payment of 400,000 KES
    kcb_id = "acc-kcb-01"
    res_kcb_before = client.get(f"/api/v1/finance/accounts/{kcb_id}", headers=admin_headers)
    bal_before = res_kcb_before.json()["currentBalance"]

    pay_payload = {
        "amount": 400000.0,
        "account_id": kcb_id,
        "payment_method": "bank_transfer",
        "payment_reference": f"RTGS-TEST-{uniq}",
        "date": "2026-11-22",
        "notes": "Milestone 1 tranche",
    }
    res_pay = client.post(f"/api/v1/finance/invoices/{inv_id}/payments", json=pay_payload, headers=admin_headers)
    assert res_pay.status_code == 200
    part_inv = res_pay.json()
    assert part_inv["amountPaid"] == 400000.0
    assert part_inv["balanceDue"] == 412000.0
    assert part_inv["status"] == "partially_paid"

    # Verify treasury account received the funds
    res_kcb_after = client.get(f"/api/v1/finance/accounts/{kcb_id}", headers=admin_headers)
    assert res_kcb_after.json()["currentBalance"] == bal_before + 400000.0

    # Record full final payment of 412,000 KES
    final_pay = {
        "amount": 412000.0,
        "account_id": kcb_id,
        "payment_method": "bank_transfer",
        "date": "2026-11-22",
    }
    res_final = client.post(f"/api/v1/finance/invoices/{inv_id}/payments", json=final_pay, headers=admin_headers)
    assert res_final.status_code == 200
    settled_inv = res_final.json()
    assert settled_inv["amountPaid"] == 812000.0
    assert settled_inv["balanceDue"] == 0.0
    assert settled_inv["status"] == "paid"


# =============================================================================
# 4. Accounts Payable (Supplier Obligations)
# =============================================================================
def test_accounts_payable_lifecycle(client, admin_headers):
    import uuid
    uniq = uuid.uuid4().hex[:6]
    payable_payload = {
        "reference": f"BILL-TEST-{uniq}",
        "supplier_name": "Oracle Cloud Infrastructure",
        "description": "Database Cluster Dedicated Node",
        "category": "Cloud Services",
        "amount_due": 180000.0,
        "currency": "KES",
        "due_date": "2026-12-10",
    }
    res = client.post("/api/v1/finance/payables", json=payable_payload, headers=admin_headers)
    assert res.status_code == 201
    bill = res.json()
    assert bill["amountDue"] == 180000.0
    assert bill["balanceDue"] == 180000.0
    assert bill["status"] == "pending"
    bill_id = bill["id"]

    # Settle bill from M-Pesa till
    mpesa_id = "acc-mpesa-01"
    res_mpesa_before = client.get(f"/api/v1/finance/accounts/{mpesa_id}", headers=admin_headers)
    bal_before = res_mpesa_before.json()["currentBalance"]

    settle_payload = {
        "amount": 180000.0,
        "account_id": mpesa_id,
        "payment_method": "mobile_money",
        "date": "2026-11-22",
    }
    res_settle = client.post(f"/api/v1/finance/payables/{bill_id}/payments", json=settle_payload, headers=admin_headers)
    assert res_settle.status_code == 200
    settled_bill = res_settle.json()
    assert settled_bill["status"] == "paid"
    assert settled_bill["balanceDue"] == 0.0

    # Verify M-Pesa till deducted
    res_mpesa_after = client.get(f"/api/v1/finance/accounts/{mpesa_id}", headers=admin_headers)
    assert res_mpesa_after.json()["currentBalance"] == bal_before - 180000.0


# =============================================================================
# 5. Budgets & Spending Caps
# =============================================================================
def test_budgets_list_and_create(client, admin_headers, member_headers):
    # List budgets
    res_list = client.get("/api/v1/finance/budgets", headers=member_headers)
    assert res_list.status_code == 200
    budgets = res_list.json()
    assert len(budgets) >= 2

    # Create budget as admin
    budget_payload = {
        "name": "Q1 2027 Autonomous Core Engineering",
        "period": "quarterly",
        "start_date": "2027-01-01",
        "end_date": "2027-03-31",
        "category": "Technology",
        "allocated_amount": 4500000.0,
        "currency": "KES",
    }
    res_create = client.post("/api/v1/finance/budgets", json=budget_payload, headers=admin_headers)
    assert res_create.status_code == 201
    created_bgt = res_create.json()
    assert created_bgt["allocatedAmount"] == 4500000.0
    assert created_bgt["remainingAmount"] == 4500000.0
    assert created_bgt["utilizationPercentage"] == 0.0


# =============================================================================
# 6. Expense & Procurement Approval Requests
# =============================================================================
def test_expense_request_workflow_submit_approve_pay(client, member_headers, admin_headers):
    # Member submits requisition
    req_payload = {
        "title": "GPU Server RAM Expansion Module",
        "description": "High-density DDR5 ECC modules for local model compilation",
        "category": "Equipment",
        "amount": 165000.0,
        "currency": "KES",
        "urgency": "urgent",
    }
    res_submit = client.post("/api/v1/finance/requests", json=req_payload, headers=member_headers)
    assert res_submit.status_code == 201
    req = res_submit.json()
    assert req["status"] == "submitted"
    req_id = req["id"]

    # Member cannot approve request
    res_bad_approve = client.post(
        f"/api/v1/finance/requests/{req_id}/review",
        json={"action": "approve"},
        headers=member_headers,
    )
    assert res_bad_approve.status_code == 403

    # Admin approves request
    res_approve = client.post(
        f"/api/v1/finance/requests/{req_id}/review",
        json={"action": "approve", "comments": "Authorized for procurement sprint"},
        headers=admin_headers,
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "approved"

    # Admin disburses payment from Petty Cash
    cash_id = "acc-cash-01"
    res_cash_before = client.get(f"/api/v1/finance/accounts/{cash_id}", headers=admin_headers)
    bal_before = res_cash_before.json()["currentBalance"]

    disburse_payload = {
        "account_id": cash_id,
        "payment_method": "cash",
        "date": "2026-11-22",
    }
    res_disburse = client.post(f"/api/v1/finance/requests/{req_id}/pay", json=disburse_payload, headers=admin_headers)
    assert res_disburse.status_code == 200
    paid_req = res_disburse.json()
    assert paid_req["status"] == "paid"
    assert paid_req["transactionId"] is not None

    # Verify cash deducted
    res_cash_after = client.get(f"/api/v1/finance/accounts/{cash_id}", headers=admin_headers)
    assert res_cash_after.json()["currentBalance"] == bal_before - 165000.0


# =============================================================================
# 7. Financial Overview & Telemetry
# =============================================================================
def test_financial_overview_telemetry(client, guest_headers):
    res = client.get("/api/v1/finance/overview", headers=guest_headers)
    assert res.status_code == 200
    data = res.json()
    assert "totalRecordedBalances" in data
    assert "totalRecordedIncome" in data
    assert "totalRecordedExpenses" in data
    assert "outstandingReceivables" in data
    assert "outstandingPayables" in data
    assert "accounts" in data
    assert "recentTransactions" in data
    assert "cashFlowTrend" in data
    assert "expenseByCategory" in data
    assert data["totalRecordedBalances"] > 0
