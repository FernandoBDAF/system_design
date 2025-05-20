
## General
- resourcers: node (a machine), pod (group of containers), service (network endpoint - load balancer or dns entry or static ip address)
  namespaces, deployment (do rolling update creating new replicaset)

kubectl get nodes -v6 (-v6 -> verbose level 6. 9 is the max)
kubectl get nodes node1 -o yaml (get the node1 yaml)
kubectl describe node node1
kubectl run pingpong --image alpine ping localhost (run a pod with name pingpong using the image called alpine and execute de command ping localhost)
kubectl logs pingpong --tail 10 --follow (see the pods logs)
kubectl scale pods pingpong --replicas 3 -v6 (that shows a fail in scaling bc scale is not set -> for that reason we have to create a replicaset)
watch kubectl get pods
kubectl create deployment pingpong --image alpine -- ping localhost (the deployment creates a replicaset and then it creates the pods)
kubectl get all (now we can see all that was created and now the scale will work)
kubectl scale deployment pingpong --replicas 3

## Services - exposing containers

- services are stable endpoints to connect to something (previously called portals)

kubectl get services
ping pod-name.namespace-name.svc (DNS resolve the name)

kubectl create deployment blue --image jpetazzo/color
kubectl expose deployment blue --port 80 (now its possible to curl blue.default.svc - svc-name.namespace-name.svc) - expose to the inside
curl <pod-ip>
while sleep 0.4; do curl blue.default.svc; done

kubectl create deployment red --image jpetazzo/color
kubectl expose deployment red --port 80 --type LoadBalancer
    -> If EXTERNAL-IP is <pending> for a LoadBalancer service:
        - Kind/Others: You might need to install a software load balancer like MetalLB.
        - Check service events for more details: kubectl describe service <service-name>
    -> another type would be NodePort that exposes a port in the cluster that redirects to the specific service

## Ingress
  - allow us to use one load balancer for all our http services (more cost efficient)
  - we need to choose and install a ingress controller, create ingress resources and set up DNS
  ### Traefik
    - cloud native load balancer
    - traefik.yaml
      - hostNetwork: true -> the pod doesnt have it own network stack but uses the network of the host (so if i am listining on the port 80 in the pod means that I am listing in port 80 of the host)
      - dashboard: ip:8080/dashboard
    - kubectl create ingress dockercoins --rule=dockercoins.44.234.104.63.nip.io/*=webui:80


  ### nip.io
    - tralala.1.2.3.4.nip.io resolves to 1.2.3.4

## Daemon sets
- way in k8s to get 1 pod per node
- is a good idea to adapt a yaml of a deployment to create a DS (very similar)
- kc create deployment rng --image dockercoins/rng:v0.1 -o yaml --dry-run=client > rng.yaml
- change kind to DaemonSet
- remove replicas

## Registary
- place to store built images

## Labels and annotations
- pieces of metadata
- we can add labels and display them on the search: kubectl label pod pod1 ex=01 kubectl get nodes --label-columns (-L) ex
- or use selector: kubectl get nodes -L ex,kubernetes.io/arch --selector ex=01
- add: --show-labels -> add all label of the filtered objects
- selectors only work in labels

## Logs
kubectl logs deployment/pingpong (all logs from all pods created by this deployment)
kubectl logs --selector app=pingpong --tail 2 --follow --prefix
-> not good to stream the logs bc it has limitations
-> installing a real logging system would be the best option 
  - if you lose the pod, you lose the logs
  - loki (log agregator that keep the logs in a central database)
  - stern (is a tool that you can use in CLI - stern --selector app=blue)

## Namespaces
kc create ns namespace-name
kc create -f ./docs/k8s/yaml/namespace-green.yaml
- the idea is create different namespaces (dev, stag, prod) and deploy the same stack in different namespaces
  - the name of the services will be the same but in different namespaces
kc apply (or create) -f docs/k8s/yaml/dockercoins.yaml -n green
- copies of stacks in different ns are not isolated from one another (network policies could take care of that)
kns green (changes the default ns) (have to install this tool)
  - other option vim ~/.kube/config and change the ns (kubectl config could do that in a safer way)
  - kubectl config set-context --namespace default --current

## Writing YAML
- kubectl create deployment pingpong --image alpine -o yaml --dry-run=client > pingpong.yaml (give the yaml file, just remove null and empty fields)

## Version Control
- save all the changes in the yaml files in a commit so you can revert using kubectl apply
  - it happens progressively
  - creates a new replicaset ta cohexist with the old one while the change happens 

## Rolling updates
- replace running pods one at a time
- kubectl rollout undo deployment worker
  - undo a previous rollout
  - 2 parameters determine the pace of the rollout: maxUnavailable (how many to shut down - 25% rounded down default) and maxSurge (how much extra resource that could be used - 25% rounded up default) - absolute number or %
  - it is very important do manage this numbers when you have a large number of pods or very large pods to avoid ending up scaling the cluster during the rolling update and having cheese with holes cluster later

## HealthChecks
  - probes are executed in intervals periodSeconds (10 sec default)
  - timeoutSeconds (1 default) time to the pod respond a probe
  - considered succesful after successThreshould successes (1 default)
  - considered failing after failureThreshold (3 default)
  - all adjusted independently for each probe
  ### startupProbe - those that take a long time to boot before being able to serve traffic
    - runs after a container creation to check if the container is booted
    - consider unhealthy until the probe succeeds
    - when that happens is not added to services endpoints nor is considered as available for rolling update purposes
    - readiness and liveness probes are enabled after sutartup reports success
    - adjust the failThreshold bc if the container fails to start within 30 seconds it will be terminated and restarted
    - sometimes is easy to use a readiness proble
  ### readinessProbe - those that are sometimes unavailable or overloaded and needs to be taken temporarily out of load balancer (reloading data, garbage collection, )
    - check if the container is ready
    - if belongs to a service, it stops recieving traffic
    - might pause a rolling update
  ### livenessProbe - those that sometimes enter a broken state which can only be fixed by a restart
    - check if the container is dead
    - terminates and restarts (unless restartPolicy is Never)
    - it takes up to 30 seg to determine that a container is dead and up to 30 seg to termina it
    - makes no sense using for problems that could not be solved by restart
    - make sure that liveness probes respond quickly because the default timeout is 1 second

  ### Probes mechanisms
    - exec
      - runs a program inside the container
      - kubectl exec or docker exec
    - httpGet
      - kubelet does a http get request
      - port must be specified
      - path and httpHeaders coudl be optionally specified
    - tcpSocket
      - check if a tcp port accepts connections
    - grpc

  ### best practices
    - always use a readiness probe
    - the other is not always necessary, use only if you realize they are necessary for some reason


## Volumes
  - directories mounted in containers that have many use cases
    - share files and directories between containers running on the same machine
    - share files and directories between containers and their host
    - centralize configuration information in Kubernetes and expose it to containers
    - manage credentials and secrets and expose them securely to containers
    - store persistent data for stateful services
    - access storage systems (like Ceph, EBS, NFS, Portworx, and many others)
  - volumes x persistent volumes
    - completely different
    - volumes: does not exist in the api, only in pods (just like containers - in pods we have containers) 
      - if the pod is deleted the volume is lost
      - if the container is restarted the volume survives
      - other volumes, like remote storage, are not "created" but rather "attached"
    - persistentvolumes are part of the api objects
      - kc get persistentvolumes
  - demo volumes
    - kc create ns voldemo
    - kubectl config set-context --namespace voldemo --current
      - kc apply -f nginx-1-without-volume.yaml
        - kc exec -ti nginx-without-volume -- bash
          - cd /usr/share/nginx/html/
          - echo 'Fernando was here' > index.html
      - kc apply -f nginx-2-with-volume.yaml
        - volumes: name: www
        - volumeMounts: name: www | mountPath: /usr/share/nginx/html/
        - if I curl to nginx-with-volume it will be forbiden
        - if check the cd /usr/share/nginx/html/ will be empty because we mount a volume on top of this volume and by default we got an empty directory
        - if I got there and create a index.html I can curl it
        - if I go to the node that runs that pod I will be able to find that volume
      - kc apply -f nginx-3-with-git.yaml
        - second container named git instaling git and cloning a repo
        - both containers shared the same volume
        - the git container will do the job and will be not ready
      - kc apply -f nginx-4-with-init.yaml
        - container initContainers instead of git as a normal container

  - Uses if init containers
    - Load content
    - Generate configuration (or certificates)
    - Database migrations
    - Waiting for other services to be up

(to avoid flurry of connection errors in main container)


## Managing configuration
  - is not a good idea to put configurations in the image
  - Environment variables
    - add env: on the container part of the yaml
    

## Tools
- kube-ps1 (improve shell promp to k8s)
- helm / argocd

### The Kubernetes dashboard
  - kc apply -f ./docs/k8s/yaml/dashboard-recommended.yaml (not totally safe version, but easier to access)
  - kc get svc -n kubernetes-dashboard
  - kubectl port-forward service/kubernetes-dashboard 8443:443 -n kubernetes-dashboard
  - kubectl --namespace=kubernetes-dashboard \
  describe secret cluster-admin-token (get token and login)

### K9s
  - text mode interface
### Tilt
  - like docker-compose but for k8s
  - the tiltfile in this project will bring the dockercoins project up
  - the tilt file define the resources we use and you define dependencies btw files so when we change the files tilt will rebuild the project and filenally update in the cluster

## Debug
- we can use kube-state-metrics: expose metrics for prometheus and we can set alerts
- kubectl describe
- kubectl edit deployment red (edit deployment manifest)
- httping <ip> (like ping sending http req and doing measures)

- to remove a pod from a load balancer without deleting it (a service) we can change its label bc the loadbalancer redirects traffic based in the selector defined in its yaml that looks for the pods labels
- another option would be to give an extra label to all pods that has the label related to the service, then change the service selector to be this new label. So you can edit this label in the pod that you want to stop the traffic without creating a replacement pod

- kubectl get service red -o yaml > service-red.yaml
- cp service-red.yaml service-red-new.yaml (then edit the file, removing everything that will be unchanged - not the father fields of the changed fields)
- diff service-red.yaml service-red-new.yaml
- kubectl patch service webui --partch-file service-red-new.yaml (or in line, instead of the file, could type what to patch: kubectl patch service blue --patch '{"spec": {"type": "NodePort"}}')

- kubectl rollout restart deployment red

- kubectl exec -it <pod-name> -- /bin/sh (to get a shell inside a running pod)
  - apk add curl (to install curl in an Alpine pod)

- kubectl run testpod -ti --rm --image alpine (run a test pod to connect to others inside of the cluster)

- kc explain svc.spec (see documentation for svc.spec)

## Cluster
- kind
  - kind create cluster
- minikube
  - legacy option - very stable w/ many plugins
  - can work in containers or vms
  - must know if you want to work with k8s
- VM with custom install

- kubectl port-foward service/redis 6379
  - connects the host computer at port 6379 to this service running inside of the cluster
  - kubectl port-foward service/web-ui 1234:80 -> map port 1234 in the host to the 80 in the cluster
  - easiest option

## Network
- all pods can talk with each other inside a cluster
- all services and pods can comunicate with one another
- network policies: indicates which flows are allowed or forbiden on a cluster

## Resources usage
- kubectl top nodes
- kc top pods
- k9s (tool)