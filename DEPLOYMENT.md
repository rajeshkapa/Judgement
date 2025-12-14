# Deployment Guide for Management Card Game to Google Cloud Run

Follow these steps to deploy the game and play with friends globally.

## Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated.
- A Google Cloud Project created.
- Docker enabled (optional, if testing locally).

## 1. Build the Docker Image
Submit the build to Cloud Build. Replace `[PROJECT_ID]` with your actual Google Cloud Project ID.

```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/management-game .
```

*Note: This command zips the current directory, uploads it to Cloud Build, builds the Docker image remotely, and stores it in Google Container Registry (GCR).*

## 2. Deploy to Cloud Run
Deploy the service using the image you just built.

**Critical configurations included:**
- `--allow-unauthenticated`: Makes the game publicly accessible.
- `--session-affinity`: **REQUIRED** for Socket.io to ensure clients stick to the same server instance.

```bash
gcloud run deploy management-game \
  --image gcr.io/[PROJECT_ID]/management-game \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --session-affinity
```

*You can change `us-central1` to a region closer to you if desired.*

## 3. Post-Deployment Instructions
1. **Find the URL**: After the deployment command finishes, it will print a "Service URL". It looks like:
   `https://management-game-[random-hash]-uc.a.run.app`

2. **Test Globally**:
   - Share this URL with your 3 friends.
   - Open the URL in your browser.
   - Everyone should see the Lobby/Login screen.
   - One person clicks "Create Room".
   - Share the generated **Room Code**.
   - Others enter the code and "Join Room".

3. **Troubleshooting**:
   - If players disconnect frequently, ensure `--session-affinity` was included.
   - Use the "Logs" tab in the Google Cloud Console (Cloud Run section) to view server logs for errors.

## 4. Local Testing (Optional)
To test the Docker image locally before deploying:

```bash
# Build locally
docker build -t management-game .

# Run container
docker run -p 8080:8080 -e PORT=8080 management-game
```
Access at http://localhost:8080.
