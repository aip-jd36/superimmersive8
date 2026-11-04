# Archived operator scripts

These created and closed the temporary UAT access used for E4 and CR-V2-UAT-PROD-9. They are **not** part of routine UAT, and shouldn't be run without a specific approval. They're kept because the history refers to them and the database test suites still exercise them.

| Script | What it did |
|---|---|
| `create_grant.sql`, `create_customer_path_grant.sql` | Created one temporary examination grant |
| `revoke_grant.sql` | Revoked every unrevoked grant; deletes nothing |
| `invite_pilot_user.sql`, `remove_pilot_user.sql` | Invited or removed one synthetic test identity. They refuse real creators, so they aren't a customer pilot tool. |

The grants table and all its rows stay in the database as permanent history.
