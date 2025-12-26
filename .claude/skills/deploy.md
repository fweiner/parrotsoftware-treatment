# Deploy to Production

**Description**: Complete deployment workflow with testing, versioning, and monitoring

**Requires approval**: Yes

## Instructions

You are a deployment automation agent. Follow these steps carefully:

### Step 1: Confirm Deployment Intent
- Ask the user to confirm they want to deploy to production
- If not confirmed, stop immediately

### Step 2: Check Git Status
- Run `git status` to see all uncommitted changes
- Show the user what will be committed
- If there are unstaged changes, stage them with `git add .`

### Step 3: Determine Version Type
- Get the current version from the latest git tag (or default to 0.0.0 if no tags exist)
- Ask the user: "Is this a new feature or a bugfix?"
  - If **new feature**: increment the minor version (0.1.0 → 0.2.0)
  - If **bugfix**: increment the patch version (0.1.0 → 0.1.1)
- Show the user the new version number and ask for confirmation

### Step 4: Commit Changes
- Create a descriptive commit message based on recent changes
- Commit all changes with the standard format including Claude Code footer
- Tag the commit with the new version: `git tag v{VERSION}`

### Step 5: Run Tests
- **Backend tests**:
  - Navigate to `backend/` directory
  - Run: `"$USERPROFILE/.local/bin/uv.exe" run pytest`
  - If tests fail, analyze the failures and fix them
  - Re-run tests until they all pass
- **Frontend checks** (if applicable):
  - Navigate to `frontend/` directory
  - Run: `npm run build` to ensure build succeeds
  - If build fails, analyze and fix issues
  - Re-run until build succeeds

### Step 6: Push to GitHub
- Push commits: `git push`
- Push tags: `git push --tags`

### Step 7: Create GitHub Release
- Use GitHub CLI to create a release:
  ```bash
  gh release create v{VERSION} --title "v{VERSION}" --generate-notes
  ```
- This will trigger the GitHub Actions deployment workflow

### Step 8: Monitor Deployment
- Use `gh run watch` to monitor the latest workflow run
- Watch for deployment success or failure
- If deployment fails:
  - Use `gh run view --log-failed` to see error logs
  - Analyze the failure reason
  - Fix the issue (update code, configuration, etc.)
  - Increment patch version (e.g., 0.1.0 → 0.1.1)
  - Repeat from Step 4 (commit, test, push, release, monitor)
- Continue monitoring and fixing until deployment succeeds

### Step 9: Verify Deployment
- Once deployment succeeds, inform the user
- Provide the release URL
- List the deployed services and their status

## Important Notes

- **Always run tests before pushing** - Never skip this step
- **Never force push** to main branch
- **Always increment version** even for deployment fixes
- **Monitor the full deployment** - Don't stop until it's confirmed successful
- **Be patient** - Deployments can take several minutes
- **Keep the user informed** - Provide status updates at each step
- **Use TodoWrite** to track deployment progress

## Error Handling

If you encounter any errors:
1. Read the full error message and logs
2. Identify the root cause
3. Fix the issue
4. Inform the user what was fixed
5. Continue with the deployment process

## Example Version Progression

- Initial: v0.1.0 (first release)
- Bugfix: v0.1.1
- New feature: v0.2.0
- Another bugfix: v0.2.1
- Major feature: v0.3.0
