# Interview Notes: Narrative Report & User Roles System

## 1. User Roles and Permissions

### Personnel In-Charge (Reporter)

- **Primary Function:** Inputs data/details into the system.
- **Submission:** Submits their own narrative reports.
- **Reference Number:** Generates/Inputs a Reference Number for tracking.
- **Status Visibility:** Can see if their report is submitted, pending, or approved.

### Admin / Manager

- **Monitoring:** Views all inputs from users/personnel.
- **Editing Rights:**
  - Initially discussed editing reference numbers, but clarified that **only specific parts** of the input can be edited by Admins to correct errors before final submission/approval.
  - Cannot change everything; limited to necessary corrections.
- **Approval Workflow:** Reviews submitted reports and approves them.
- **Report Generation:**
  - Can generate consolidated reports based on status (e.g., "Submitted," "Approved").
  - Can view remarks/comments added during the approval process.
- **Receipt Management:** Issues Acknowledgement Receipts after successful submission/approval.

---

## 2. Core Workflows

### A. Submission Process (Personnel)

1.  Input personal details and narrative content.
2.  Generate/Input Reference Number.
3.  Submit Report.
4.  Receive Acknowledgement Receipt (digital/printable).
5.  Wait for Admin review/approval.

### B. Review & Approval Process (Admin)

1.  View list of submitted reports.
2.  Check details against requirements.
3.  Edit specific fields if correction is needed (limited scope).
4.  Add Remarks/Comments if necessary.
5.  Approve Report.
6.  System updates status to "Approved."
7.  Issue Final Acknowledgement Receipt with QR Code/Signature placeholder.

### C. Reporting & Exporting

- **Filtering:** Filter reports by status (e.g., Submitted vs. Approved).
- **Export:** Option to export data/reports to Excel/PDF format.
- **Print:** Print finalized reports with signatures/stamps.

---

## 3. Data Fields & UI Elements Discussed

| Field/Element               | Description                            | Notes                                              |
| :-------------------------- | :------------------------------------- | :------------------------------------------------- |
| **Reference No.**           | Unique ID for each report              | Auto-generated or manually entered? Clarify logic. |
| **Narrative Content**       | Main body of the report                | Text area/file upload support implied.             |
| **Status**                  | Pending, Submitted, Approved, Rejected | Critical for filtering and workflow visibility.    |
| **Remarks**                 | Comments from Admin                    | Visible to reporter upon return/edit.              |
| **Acknowledgement Receipt** | Proof of submission/approval           | Contains QR code, date, time, signature line.      |
| **QR Code**                 | For verification/tracking              | Mentioned in receipt generation step.              |
| **Signature Placeholder**   | Space for physical/digital sign        | Appears after approval stage.                      |
| **Date/Time Stamp**         | When action occurred                   | Important for audit trail.                         |

---

## 4. Key Decisions & Clarifications from Interview

✅ **Editing Scope:**  
Admins do NOT have full edit rights over every field. They can only modify _specific sections_ required for correction — likely metadata or formatting issues, not core narrative content unless explicitly allowed per policy.

➡️ _Action Item:_ Define which fields are editable by Admin post-submission. Document this rule clearly in app permissions matrix.

✅ **Receipt Issuance Timing:**  
Acknowledgement Receipts are generated at two stages:

- Upon initial submission (proves it was received)
- After admin approval (final version with stamp/signature space)

➡️ _Action Item:_ Implement dual-receipt system with distinct templates/status labels.

✅ **Search & Filter Logic:**  
Users should be able to search/filter by:

- Reference Number
- Status (Submitted / Approved / Pending)
- Date Range
- Personnel Name

➡️ _Action Item:_ Build advanced filter panel accessible via dashboard sidebar/top bar.

✅ **Export Format Preference:**  
Excel (.xlsx) preferred for bulk exports due to ease of manipulation outside the system. PDF reserved for official printed copies with branding/signatures.

➡️ _Action Item:_ Offer both formats as download options under “Reports” menu.

✅ **Error Handling / Correction Flow:**  
If an error is found during admin review:
→ Admin edits permitted fields → Saves changes → Notifies user (optional email/in-app alert)? → User may need to re-confirm/resubmit?

⚠️ _Unclear Point:_ Does the user get notified when admin makes edits? Should there be a “Revision Requested” state instead of silent editing?

➡️ _Recommendation:_ Introduce intermediate status like “Under Revision” so transparency is maintained between parties.

---

## 5. Open Questions / To Be Resolved Before Development

❓ Who exactly generates the Reference Number? Is it auto-incremented by DB, UUID-based, or formatted string (e.g., NR-YYYYMMDD-XXXX)?

❓ Are attachments supported alongside narrative text? If yes, what file types/sizes max?

❓ Is there role hierarchy beyond just “Admin” and “Personnel”? E.g., Super Admin, Department Head, Viewer-only roles?

❓ How long does retention last for old reports/archived submissions? Any cleanup schedule?

❓ Must approvals require multi-level authorization depending on amount/type of report? Or single-tier sufficient?

❓ What happens if someone tries to submit while offline? Local draft saving mechanism needed?

❓ Integration points: Will this connect to HRIS/payroll/email/SMS gateway for notifications?

---

## 6. Suggested Next Steps for App Revision

1. **Map Out State Machine Diagram**  
   Visualize transitions: Draft → Submitted → Under Review → Revised → Approved → Archived. Include triggers/actions/events.

2. **Define Role-Based Access Control Matrix**  
   Table showing who sees/does what across modules (Input, Edit, Approve, Export, Delete).

3. **Wireframe Key Screens Based on Feedback**
   - Dashboard (with filters/search)
   - Submission Form (highlighting editable vs locked fields)
   - Admin Review Panel (show diff highlights + remark box)
   - Receipt Preview Modal (before printing/downloading)

4. **Backend Schema Adjustment Proposal**  
   Add columns: `last_edited_by`, `edit_reason`, `revision_count`, `approval_timestamp`, `receipt_id`.

5. **Notification Strategy Plan**  
   Decide whether real-time alerts (in-app toast/push), daily digest emails, or SMS fallbacks will accompany key events (submission, revision request, approval).

6. **Testing Scenarios Outline**  
   Create test cases covering edge scenarios: concurrent edits, invalid ref no., missing mandatory fields, large attachment uploads, expired sessions mid-form-fill.

---

> 💡 Pro Tip: Since stakeholders emphasized clarity around _who touches what_, consider adding visual indicators next to form fields (“Locked”, “Editable by Admin Only”) plus tooltips explaining why certain areas aren’t modifiable directly by submitters. This reduces confusion upfront rather than relying solely on backend enforcement.
