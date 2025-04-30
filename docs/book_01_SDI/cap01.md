CAP 01: Scale up a system to serve millions of users

# Database
- Separetinh web/mobile tarffic (web tier) and db (data tier) servers allos them to be scaled independently
- RDBMS or SQL vs NoSQL (key-value, graph stores, column stores and document stores)
- Non-relatinal dbs might be the right choice if: requires super low-latency, unstructured data or no relational data, only need to serealize and deserealize data, store a massive amount of data

# Scaling: vertical vs horizontal
- verical: adds more power - great option for low traffic. Do not help with redudancy.
- horizontal: adding more servers into the pool

# Database replication
- can be used in mani db management systems, usually with master/slave relationship.
- master supports only modifications commnands (create, update, delete), slave just supports reads.
- higher rate of slaves over master because write is more frequent
- what if one of the db becomes offline?
    - slave goes off: redirects the traffic to other slaves but if only on slave available goes offline, the reads are redirected to the master. A new slave will replace it asap.
    - master goes off: a slave will be promoted to master which is often complicated as the slave might not be up to date.

# Cache
- temporary data store much faster then the db.
- read-through cache: web server 1st checks if the cache has the response, if it does data is send back to the client. If not, it queries the db, store the response in cache, and sends it back to the client.
- when to use cache?
    - data is frequently read and infrequently changed
    - have a expiration policy
    - consistency: keep the data store and cache in sync. Can happen bc operations on the data store and cache are not in a single transaction
    - eviction policy: how to deak when cache is full - LRU vs FIFO.

# CDN
- geographically dispersed serves used to delivered static content (images, videos, CSS, JS, etc)

# Stateless web tier
- to scale horizontally we need to remove state out of the web tier. A good practice is to store session data in the persistent storage such as SQL or NoSQL.
- in this architecture, http requests from users can be sent to any web servers, which getch data from a shared data store.


# Data Centers
- to improve availability and provide better user experience acress wider geographical areas, supporting multiple data centers is crucial
- geoDNS is a DNS service that allows domain names to be resolved to IP addresses based on the location of a user.

# Message Queue
- to futher scale our system, we need to decouple different components of the system. Msg queue is a key strategy to solve this problem.
- durable component, stored in memory,that supports async communication.
- Input services (producers/publishers) create messages and publish them.
- Consumers/subscribers connect to the queue and perform actions defined by the messages.
- the producer and the consumer can be scaled independently.

# Logging, metrics, automation

# Database scaling
- sharding is the practice of horizontally scalling adding more servers
- separets large databases into smaller more easily managed parts called shards. They share the same schama, though the actual data on each shard is unique to the shard
- Introduce complexity and new challenges:
    - resharding data
    - celebrity problem
    - join and de-normalization
- move non relational functionalities to a NoSQL data store.