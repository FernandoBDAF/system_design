Design a rate limiter

# Benefits
- prevent resource starvation caused by Denial of Service (DoS) attack
- reduce cost: limiting excess requests means fewer servers and allocating more resources to high priority APIs. Rate limiting is extremely important for companies that use paid third party APIs.
- prevent servers from being overloaded

# Where to put
- client-side: unreliable place to enforce rate limiting. Moreover we might not have controle over the client implementation.
- server-side: function part of the API server.
- middleware: throttles requests to the APIs

- cloud services usually implement within a component called API gateway which supports rate limiting, SSL termination, authentication, IP whitelisting, servicing static content, etc.

# Algorithms
- token bucket
- leaking bucket
- fixed window counter
- sliding window log
- sliding window counter

# High-level architecture
- we need a counter to keep track of how many requests are sent from the same user, IP addressm etc.
- cache is a good option b its fast and supports time-based expiration strategy

# Design deep dive
- Rate limiting rules
    - generally written in configuration files and saved on disk
    - im case a request is rate limited, APIs return a http responsecode 429
    - rate limiter headers: remaining, limit, retry-after
- rate limiter in a distributed environment
    - Race condition
        - locks are the most obvious solution
        - significanty slow down the system
    - Synchronization issue
        - the better approach is to use centralized data stores
- performance optimization
    - multi-data center
- monitoring
    - make sure the rate limiting algorithm is effective
    - and the rules are effective