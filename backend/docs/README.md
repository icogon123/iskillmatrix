# Backend documentation

| Document | Read it when you want to… |
|----------|---------------------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | understand how the code is organised, how a request flows, and how security works |
| [API.md](API.md) | call an endpoint from the frontend, Postman or another app |
| [DATABASE.md](DATABASE.md) | know what each MongoDB collection stores |
| [INCOME_ENGINE.md](INCOME_ENGINE.md) | understand or change how commissions, bonuses, badges and withdrawals are calculated |
| [CONFIGURATION.md](CONFIGURATION.md) | set environment variables or admin settings |
| [DEPLOYMENT.md](DEPLOYMENT.md) | put the site live on iskillmatrix.com |

Installation and running are covered in the backend [README](../README.md).
The frontend has its own docs in [`frontend/docs`](../../frontend/docs/README.md).

## Glossary

| Term | Meaning |
|------|---------|
| **Member ID** | Public ID like `ISM100002`. Also the referral code. |
| **Sponsor** | The member whose referral code/link was used to register. |
| **Upline / ancestors** | The sponsor, the sponsor's sponsor, and so on up to the root. |
| **Downline / team** | Everyone below a member in the sponsor tree. |
| **Direct / Level 1 team** | Members a person sponsored personally. |
| **Root member** | Company account `ISM100001`, top of the tree. |
| **Active member** | Account status `active` **and** a package that has been paid and approved. |
| **Ledger** | The list of every credit and debit. Wallet balance is calculated from it. |
| **Lapsed** | Income that would have gone to an inactive upline; recorded but not credited. |
| **Run** | A weekly / monthly bonus / royalty calculation that the admin reviews and approves. |
| **IST** | Indian Standard Time (UTC+05:30). All days, weeks and months use IST. |
