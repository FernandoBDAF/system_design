# API Documentation

## Overview

This document provides comprehensive documentation for the Profile Service API, including endpoints, request/response formats, and usage examples.

## Base URL

- Development: `http://localhost:8080`
- Production: `http://server:8080`

## Authentication

All API endpoints require authentication using a service account token:

```bash
curl -H "Authorization: Bearer $TOKEN" http://server:8080/api/v1/profiles
```

## Endpoints

### Profile Management

#### Create Profile

```http
POST /api/v1/profiles
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "bio": "string"
}
```

Response:

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "bio": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Get Profile

```http
GET /api/v1/profiles/:id
```

Response:

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "bio": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Update Profile

```http
PUT /api/v1/profiles/:id
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "bio": "string"
}
```

Response:

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "bio": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Delete Profile

```http
DELETE /api/v1/profiles/:id
```

Response: 204 No Content

### Task Management

#### Submit Delayed Task

```http
POST /api/v1/tasks/delayed
Content-Type: application/json

{
  "type": "string",
  "payload": {},
  "delay": "duration"
}
```

Response:

```json
{
  "id": "string",
  "status": "string",
  "created_at": "timestamp"
}
```

#### Get Task Status

```http
GET /api/v1/tasks/:id
```

Response:

```json
{
  "id": "string",
  "status": "string",
  "result": {},
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### System Endpoints

#### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "timestamp"
}
```

#### Metrics

```http
GET /metrics
```

Response: Prometheus metrics format

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

### Common Error Codes

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

- 100 requests per minute per IP
- Rate limit headers:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

## WebSocket API

### Connection

```javascript
const ws = new WebSocket("ws://server:8080/ws");
```

### Events

- `profile.created`
- `profile.updated`
- `profile.deleted`
- `task.completed`

### Message Format

```json
{
  "event": "string",
  "data": {},
  "timestamp": "timestamp"
}
```

## Testing

### Local Testing

```bash
# Start server
go run cmd/main.go

# Run tests
go test ./...
```

### API Testing

```bash
# Run API tests
make test-api

# Run integration tests
make test-integration
```

## Monitoring

### Metrics

- Request latency
- Error rates
- Cache hit rates
- Queue lengths
- Resource usage

### Logging

- Request/response logging
- Error tracking
- Performance metrics
- Audit trails

## Security

### Authentication

- Service account tokens
- RBAC permissions
- Token rotation
- Access logging

### Data Protection

- Input validation
- Output sanitization
- Rate limiting
- Request logging
