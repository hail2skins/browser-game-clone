# Build stage - Node + .NET
FROM node:20-slim AS node-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-builder
WORKDIR /app
COPY . .
RUN dotnet publish App.csproj -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=dotnet-builder /app/out ./
COPY --from=node-builder /app/client/dist ./client/dist
EXPOSE 8080
ENTRYPOINT ["./App"]
