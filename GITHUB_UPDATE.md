# Update GitHub quickly (Akkous)

Repository:
- `https://github.com/INVOOFFICE/Akkous`

Local folder:
- `C:\Users\M2B PRO\Desktop\GITHUB\FOOD`

---

## One-click update script

Use the file:
- `update-github.bat`

### How to use

1. Open `C:\Users\M2B PRO\Desktop\GITHUB\FOOD`
2. Double-click `update-github.bat`
3. Wait until it finishes

The script automatically runs:
- `git add -A`
- `git commit` (if there are changes)
- `git pull --rebase origin main`
- `git push origin main`

---

## Optional custom commit message

You can run the script from CMD with a custom message:

```bat
cd /d "C:\Users\M2B PRO\Desktop\GITHUB\FOOD"
update-github.bat "Update PWA banner and WhatsApp share"
```

---

## If Git asks for login

- Login with your GitHub account in the Git prompt window.
- If needed, use a GitHub Personal Access Token as password.

---

## If there is a conflict

If the script stops at `pull --rebase`:
1. Resolve the conflicting files
2. Run:

```bat
git add -A
git rebase --continue
git push origin main
```

Or rerun `update-github.bat` after resolving.
