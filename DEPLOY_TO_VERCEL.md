# Deployment to Vercel

This application is configured for deployment on Vercel.

## Prerequisites

1. **Vercel Account**: You need an account at [vercel.com](https://vercel.com).
2. **Vercel CLI** (Optional but recommended): Install with `npm i -g vercel`.

## Deployment Steps

### Option 1: Using Vercel CLI (Recommended)

1. Open your terminal in the project directory.
2. Run the deployment command:

    ```bash
    npx vercel
    ```

3. Follow the prompts:
    * **Set up and deploy?** [Y]
    * **Which scope?** [Select your account]
    * **Link to existing project?** [N] (unless you already created one)
    * **Project name?** [offer-app] (or your preferred name)
    * **In which directory is your code located?** [./] (default)
    * **Want to modify these settings?** [N] (default settings are correct)

4. Vercel will build and deploy your application. You will get a production URL (e.g., `https://offer-app-yourname.vercel.app`).

### Option 2: Using Vercel Dashboard (Git Integration)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your repository.
4. Vercel will automatically detect that it's a **Vite** project.
5. Click **Deploy**.

## Environment Variables

If you use Supabase or other services, make sure to add your environment variables in the Vercel Dashboard:

1. Go to your project settings on Vercel.
2. Click on **Environment Variables**.
3. Add the variables from your `.env.local` file (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Configuration

* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Install Command**: `npm install`

The `vercel.json` file in the root directory handles routing for the Single Page Application (SPA), ensuring that all paths redirect to `index.html`.
