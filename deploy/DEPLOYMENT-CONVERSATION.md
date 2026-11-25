# Book Activity deployment conversation

**Recorded:** 23 November 2026 (Asia/Karachi)
**Purpose:** A condensed record of our deployment discussion, decisions, completed work and remaining steps. This is not a word-for-word transcript. Passwords and authentication tokens are intentionally omitted.

The statuses below reflect the last checks performed during this conversation. Creating this document does not deploy code, push a branch or recheck live services.

## 1. Original deployment requirements

**User:** Prepare Docker and a GitHub deployment pipeline for our office Ubuntu server. Push to main only when explicitly instructed.

**Assistant:** Prepared the Dockerfile, Docker Compose configuration, CI workflow, manual release workflow, database migration process, health checks, backups and deployment documentation.

Agreed behaviour:

- Branch pushes and pull requests run CI.
- A push does not automatically merge into main or deploy production.
- A production release is started manually against an approved full commit SHA already on main.
- Required verification must pass before publishing and deploying the image.
- Main must not be updated without explicit user permission.

## 2. Can the existing VirtualBox server host this project?

**User:** Our Windows server is `10.20.10.91`. It hosts an Ubuntu VirtualBox VM at `10.20.10.97`, where ATS is already running. Can we deploy Book Activity there too?

**Assistant:** Yes, subject to checking capacity and avoiding conflicts with existing services. Separate containers, database storage and application configuration can share the same Ubuntu VM and existing web proxy.

The subsequent inspection found:

| Item | Observed during setup |
| --- | --- |
| Windows host | Windows 11 Pro; approximately 32 GB RAM |
| VirtualBox VM | `UbuntuAttendance`, running with bridged networking |
| VM allocation | 16 GB RAM and 5 virtual CPUs |
| Ubuntu | Ubuntu 26.04.1 LTS |
| Available VM RAM | Approximately 13.7 GB at inspection |
| Free VM disk space | Approximately 180 GB at inspection |
| Deployment account | `deploy`, with sudo and Docker access |
| Docker / Compose | Already installed |

Resource figures are inspection snapshots, not guaranteed current availability.

## 3. WinRM access discussion

**User:** WinRM worked from another computer. Do we need to enable it again?

**Assistant:** Client-side trust and server-side availability are separate checks. A working setup on another computer does not prove that this workstation can reach the listener.

The current workstation used source IP `10.12.12.22`. The client TrustedHosts entry was added using this one-line command:

```powershell
Set-Item -Path WSMan:\localhost\Client\TrustedHosts -Value "10.20.10.91" -Concatenate -Force
```

The initial port tests failed. The user then ran the following on the Windows server in elevated PowerShell:

```powershell
Enable-PSRemoting -SkipNetworkProfileCheck -Force
```

```powershell
New-NetFirewallRule -Name "BookActivity-WinRM" -DisplayName "Book Activity WinRM" -Direction Inbound -Protocol TCP -LocalPort 5985 -RemoteAddress 10.12.12.22 -Action Allow -Profile Any
```

`Test-WSMan localhost` succeeded, and remote WinRM inspection subsequently worked. Deployment inside Ubuntu was then performed directly over SSH as `deploy`.

These commands document the setup already performed; they do not need to be repeated merely because this document is being read.

## 4. What was already running on Ubuntu?

The existing Compose project is `attendance-prod`, under `/opt/attendance`.

Its services include:

- ATS API application.
- PostgreSQL 16.
- Redis.
- Caddy, which owns public ports 80 and 443.

The shared Caddy configuration is `/opt/attendance/Caddyfile`. It also contains the route for `visit.javedpublishers.com`.

**Decision:** Keep ATS's application and database separate from Book Activity. Reuse the existing public Caddy rather than starting a competing public proxy on the same ports.

## 5. Domain choice

**User:** Can we use `ecosystem.javedpublishers.com` even though ATS uses a different parent domain?

**Assistant:** Yes. The same proxy can route different hostnames to different applications.

Chosen address:

```text
https://ecosystem.javedpublishers.com/Book-Activity/
```

The application redirects its domain root to `/Book-Activity/`.

## 6. Initial server deployment

**User:** Proceed with everything, then give us the DNS/network instructions.

Completed on Ubuntu:

1. Created the separate deployment directory `/srv/book-activity`.
2. Transferred source from approved Book Activity commit `686a01b6d4c34673a27b112a5fd03b284c1e8012` and verified the archive checksum.
3. Generated separate production database credentials in a private server `.env`.
4. Built the production Docker image on Ubuntu.
5. Created Book Activity's PostgreSQL 17 service and persistent volumes.
6. Restored the local database snapshot, preserving **3 accounts and 1 uploaded book**, including existing account credentials and permissions.
7. Ran database migrations; the restored database was up to date.
8. Started the application and internal gateway.
9. Installed a daily database backup timer for **02:30 Asia/Karachi**.

The Book Activity Compose project is `book-activity`. Its running service names are:

```text
book-activity-app-1
book-activity-db-1
book-activity-proxy-1
```

### Shared proxy arrangement

```text
Existing public Caddy
  ├─ ats.inspirertechnologies.com → existing ATS application
  └─ ecosystem.javedpublishers.com
       → book-activity-gateway:80
       → Book Activity application:3001
       → separate Book Activity PostgreSQL database
```

`compose.office.yaml` removes public port bindings from Book Activity's internal gateway. Only that gateway joins the existing `attendance-prod_default` network; the Book Activity application/database use their own project network.

The server `.env` selects both Compose files:

```text
COMPOSE_FILE=compose.yaml:compose.office.yaml
COMPOSE_PROJECT_NAME=book-activity
SITE_HOST=ecosystem.javedpublishers.com
```

The production passwords are not recorded here.

### Production checks completed

- Application/database health endpoint returned HTTP 200.
- Frontend HTML and JavaScript assets returned HTTP 200.
- Existing administrator login worked and issued a Secure session cookie.
- Authenticated account and catalogue requests worked.
- The 3 accounts and 1 published book were present.
- Uploaded book archive and protected native book access worked with authentication.
- Unauthenticated catalogue/book requests were blocked.
- An unapproved request origin was blocked.
- Logout worked.
- ATS remained healthy and returned HTTP 200 after the proxy change.

The separate `visit.javedpublishers.com` route returned HTTP 502 both before and after the Book Activity proxy change. That was recorded as a pre-existing issue; its route was not changed.

## 7. Making the ATS proxy change permanent

**User:** Is the ATS side fully done, or does something need to be added?

**Assistant:** The live proxy already had the ecosystem route, but ATS releases overwrite its Caddyfile from the ATS source repository. The route also needed to be added to that source.

Repository and file:

```text
moeez4316/Automated_Attendance_System
attendance-cloud/Caddyfile
```

Required separate, top-level block:

```caddyfile
ecosystem.javedpublishers.com {
    encode zstd gzip
    reverse_proxy book-activity-gateway:80
}
```

**User:** The ATS commit is `58f7b9d0b6a9ada39423f14e4f293bef5e0864ee`. Please confirm completion.

**Assistant verification:**

- ATS's checked-out commit matched the supplied SHA.
- The checked-out source included the ecosystem domain and gateway.
- The running ATS image used that SHA and was healthy.
- The host Caddyfile and active proxy both contained the route.
- ATS returned HTTP 200.
- Book Activity's gateway/database health check succeeded.

**Result:** The ATS source-persistence requirement was completed and verified.

## 8. GitHub access and the corrected ownership guidance

The GitHub account configured on this workstation is `zahin2002`. It can push to Book Activity but does not own that repository. ATS's private repository was not accessible through that account; its deployed source was inspected through the VM.

**User:** I cannot find an option to grant Admin access on Book Activity.

**Assistant correction:** `technologies-inspirer` is a personal GitHub account. Personal repositories have Owner and Collaborator access, not an assignable Admin role. The earlier instruction to grant Admin was incorrect for this repository. The owner needed to perform runner registration.

No repository transfer was performed.

## 9. Book Activity runner, registry and production environment

The official Linux x64 runner binaries were downloaded and checksum-verified separately from the ATS runner.

**User:** Runner registration and service installation succeeded.

**Assistant verification:**

```text
Runner name: book-activity-office
Version: 2.338.2
Labels: self-hosted, Linux, X64, office-production
Service: actions.runner.technologies-inspirer-Book-Activity.book-activity-office.service
Account: deploy
State: connected to GitHub and listening for jobs
```

The registration helper is:

```bash
bash /srv/book-activity/register-office-runner.sh
```

Registration has already been completed; this is retained as an installation reference.

Private registry access was configured separately from ATS:

```bash
DOCKER_CONFIG=/srv/book-activity/docker-auth docker login ghcr.io --username technologies-inspirer
```

The user entered a package-read token interactively. The assistant later verified that the stored registry login authenticated successfully. The runner service uses the same dedicated `DOCKER_CONFIG` directory.

The GitHub `production` environment was created and verified to allow branch `main` only. The repository variable `ENABLE_OFFICE_DEPLOYMENT` was initially `false`. The user subsequently started a release which reached its enabled deploy job.

## 10. First GitHub-driven release and the slow checkout

**User:** The deploy job has spent more than 20 minutes at the final Git fetch. Should it take this long?

Release examined:

```text
Run ID: 45187031915
https://github.com/technologies-inspirer/Book-Activity/actions/runs/45187031915
Approved application SHA: 686a01b6d4c34673a27b112a5fd03b284c1e8012
```

Verified at that check:

- Commit approval passed.
- CI tests, Docker build and production-container smoke tests passed.
- Image publishing passed.
- The office deploy job was still in `actions/checkout@v4`.
- Git object files were growing, so it was downloading rather than completely frozen.
- The observed download rate was roughly 7 KB/s.
- The deployment command had not started.
- Book Activity and ATS remained healthy.

The deploy checkout unnecessarily fetched the large book repository even though the deploy job only runs scripts and installs the already-built image.

### Prepared workflow fix

The local `.github/workflows/release.yml` change restricts the office checkout to `deploy/` and adds time limits:

```yaml
deploy:
  # Existing conditions, dependencies and runner labels are retained.
  timeout-minutes: 45
  steps:
    - name: Check out deployment scripts only
      uses: actions/checkout@v4
      timeout-minutes: 10
      with:
        ref: ${{ needs.approve-ref.outputs.sha }}
        persist-credentials: false
        sparse-checkout: deploy
    # The existing Deploy approved image step follows.
```

The installed checkout action was inspected and confirmed to use a `blob:none` fetch when sparse checkout is requested.

A separate test directory on the VM completed the filtered checkout in **24 seconds**, using approximately **1.1 MB of Git object storage**. Required deployment files were present and book assets were absent from that checkout. The workflow YAML structure validated.

**This fix was prepared locally but had not been pushed to main at the end of this discussion.** Permission was requested to push it, cancel the slow run and start a fresh release. The user asked about asset delivery before approving that action.

## 11. What happens to assets with selective checkout?

**User:** What about the assets and everything else needed from the repository?

**Assistant:** Only the final office deployment checkout is selective. The build jobs still use the full approved source to construct the production image.

| Content | Delivery/storage |
| --- | --- |
| Frontend/backend and required bundled images, icons, book pages and sounds | Production Docker image |
| Accounts, permissions and uploaded book projects | Persistent PostgreSQL database |
| Local recorded video files | Mounted server videos directory; excluded from Git/image |
| YouTube videos | External services reached through configured links |
| Compose files and release scripts | Small `deploy/` checkout |

The server still pulls the complete Docker image. The 24-second result measured checkout only, not the entire deployment. A first image pull can still take time; later pulls can reuse unchanged layers.

## 12. DNS and network handoff

Give the domain/network administrator:

| Setting | Value |
| --- | --- |
| Record type | A |
| Name/Host | ecosystem |
| Parent domain | javedpublishers.com |
| IPv4 value | 157.20.146.68 |
| Initial TTL | 300 seconds |

Keep the existing TCP 80/443 forwarding to Ubuntu `10.20.10.97`. No additional public application, database or WinRM ports are needed for website access. Preserve ATS's DNS/routing.

At the last DNS/TLS check, the ecosystem hostname did not resolve and its public HTTPS certificate was not ready. After DNS is configured, verify certificate issuance and browser access at:

```text
https://ecosystem.javedpublishers.com/Book-Activity/
```

Then verify login, school access, PDF saving, QR links and media playback through the public HTTPS address, and recheck ATS.

## 13. Last confirmed status and next steps

| Area | Last confirmed status |
| --- | --- |
| Book Activity initial server deployment | Running; production gateway checks passed |
| Existing data | 3 accounts and 1 uploaded book restored |
| Daily database backup | Active at 02:30 Pakistan time; backup archive verified |
| ATS source and active ecosystem route | Verified at ATS commit `58f7b9d0b6a9ada39423f14e4f293bef5e0864ee` |
| Book Activity runner | Registered, connected and listening |
| Dedicated registry authentication | Validated successfully |
| Production environment | Created; deployment branch restricted to main |
| GitHub release | Tests/image publication passed; deploy checkout was slow at last inspection |
| Smaller deploy checkout | Prepared locally; VM test and YAML validation passed |
| DNS/public HTTPS | Pending at last check |
| Off-VM backup destination | Not configured |

Outstanding sequence:

1. Obtain explicit permission for the prepared workflow fix to be pushed to main.
2. Apply/push that fix, check the old run's current status, and cancel/restart it if still necessary.
3. Confirm the GitHub-driven deployment finishes successfully and recheck both applications.
4. Have the network/domain administrator create the DNS record.
5. Verify public HTTPS and complete browser acceptance checks.
6. Select and configure an off-VM backup destination.

Secrets belong in their existing protected stores, not in this document or Git history.
