# 🚀 Deployment Guide for Costik Finans

## Render Deployment

This project is optimized for deployment on [Render](https://render.com/).

### Quick Deploy

1. **Fork/Clone this repository**: https://github.com/cocghaha1999/Finans.git

2. **Connect to Render**:
   - Go to [render.com](https://render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configuration**:
   - **Name**: `costik-finans` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `18.x` or later

4. **Environment Variables**:
   Add these environment variables in Render dashboard:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Deploy**: Click "Create Web Service"

### Auto-Deploy with render.yaml

This project includes a `render.yaml` file for Infrastructure as Code deployment:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Render will automatically detect the `render.yaml` configuration
5. Add your environment variables
6. Deploy!

## Firebase Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication and Firestore

2. **Get Configuration**:
   - Go to Project Settings → General
   - Scroll down to "Your apps"
   - Copy the config object values

3. **Set Environment Variables**:
   Use the values from Firebase config in your deployment platform

## Alternative Deployment Platforms

### Vercel
```bash
npm i -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload /build folder to Netlify
```

### Docker (Self-hosted)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Post-Deployment Checklist

- [ ] Test authentication flow
- [ ] Verify Firebase connection
- [ ] Check PWA functionality
- [ ] Test offline capabilities
- [ ] Validate responsive design
- [ ] Confirm all routes work
- [ ] Test transaction CRUD operations

## Troubleshooting

### Common Issues

1. **Build Errors**:
   - Check Node.js version (18+ required)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Firebase Connection Issues**:
   - Verify environment variables are set correctly
   - Check Firebase project configuration
   - Ensure Firestore rules allow read/write

3. **PWA Issues**:
   - Check if all required icons are present
   - Verify manifest.json configuration
   - Test service worker registration

### Performance Optimization

- Enable gzip compression
- Set up CDN for static assets
- Configure proper caching headers
- Monitor Core Web Vitals

## Monitoring & Analytics

Consider adding:
- Google Analytics
- Sentry for error tracking
- Performance monitoring
- Uptime monitoring

## Security Considerations

- Keep Firebase security rules restrictive
- Use environment variables for sensitive data
- Enable HTTPS/SSL
- Implement proper authentication
- Regular security audits

## Support

For deployment issues:
1. Check the build logs
2. Verify environment variables
3. Test locally first
4. Contact support if needed

---

**Repository**: https://github.com/cocghaha1999/Finans.git
**Live Demo**: Will be available after deployment
**Tech Stack**: Next.js 15, React 19, Firebase, TypeScript
