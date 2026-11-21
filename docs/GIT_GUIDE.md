# Git guide (Windows, IDE terminal)

## One time
1. Check Git: `git --version`. If not found, install from git-scm.com and reopen the IDE.
2. Tell Git who you are (use the email of your GitHub account):
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"

## Create the repo (GitHub website)
New repository -> name `claim-whats-yours` -> Public -> do NOT tick README, .gitignore or licence -> Create.

## Connect (easiest: clone)
In the IDE: Source Control -> Clone Repository -> paste the repo URL -> choose a parent folder -> Open. Sign in with GitHub in the browser if asked. This folder is your project and is already linked.

## Connect (alternative: existing empty folder)
In the IDE terminal, inside the folder:
   git init
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/claim-whats-yours.git

## Every time you finish a working step
   git status                      (see what changed)
   git add .                       (stage everything)
   git commit -m "Add eligibility engine with tests"
   git push -u origin main         (first push)
   git push                        (all later pushes)

## Rules of thumb
- Commit only when the app still runs. Push at least once an hour.
- Use clear messages (what you added). Judges can see your history.
- Never commit .env files or keys. .gitignore must contain node_modules, dist, .env.
- Repo must be Public before submission. Check by opening it in a private window.

## Common errors
- "Author identity unknown": run the two git config commands.
- "not a git repository": you are in the wrong folder, `cd` into the project.
- "rejected ... fetch first": the remote has something you do not: `git pull origin main --allow-unrelated-histories`, then push again.
- Browser login keeps failing: use a GitHub Personal Access Token as the password (GitHub -> Settings -> Developer settings -> Tokens).
