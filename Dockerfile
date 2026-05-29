# 1. Use the base image from your PDF
FROM node:22-alpine

# 2. Create the app directory
WORKDIR /app

# 3. Copy your package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of your website code
COPY . .

# 5. Build your Next.js app
RUN npm run build

# 6. Document the port (from your PDF)
EXPOSE 3000

# 7. Start the app
CMD ["npm", "start"]