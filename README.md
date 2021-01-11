# Digital Certificates in HyperLedger 



-----
The project is curretly in development using frameworks and tools from Hyperledger, in particular [Fabric](https://hyperledger-fabric.readthedocs.io/en/release-1.1/) and [Composer](https://hyperledger.github.io/composer/latest/introduction/introduction)  

In this posting we will be deploying into a [single-organization](https://hyperledger.github.io/composer/latest/tutorials/deploy-to-fabric-single-org) the same business network, start the rest-server and the user interfaces generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.0.1. 

## Deployment of Hyperledger Fabric onto a single-organization  

First we need to intall the version of node and npm that is compatible with composer and fabric.
`````
nvm install 8.17
`````
Deploying a Hyperledger Composer blockchain business network to Hyperledger Fabric for a single organization

https://hyperledger.github.io/composer/latest/tutorials/deploy-to-fabric-single-org

Follow *steps one and two* from the tutorial: 1-Starting a Hyperledger Fabric network; 2-Exploring the Hyperledger Fabric network.

In *step three* create a folder called `certificates` and follow the instructions:
3-Building a connection profile (copy the example connection profile) and save to the folder `connection.json`.

Follow *step four* to locate the certificate and private key for the Hyperledger Fabric administrator and copying these certificates in the file `certificates`. Note that these certificates change every time we boostrap the fabric network.

Navigate to the folder you just created and follow *step five*, creating a business network card for the Hyperledger Fabric administrator:
`````
composer card create -p connection.json -u PeerAdmin -c Admin@org1.example.com-cert.pem -k 114aab0e76bf0c78308f89efc4b8c9423e31568da0c340ca187a9b17aa9a4457_sk -r PeerAdmin -r ChannelAdmin
`````
Follow *step six* to import the business network card for the Hyperledger Fabric administrator,
`````
composer card import -f PeerAdmin@fabric-network.card
`````
In *step seven* we install the Hyperledger Composer business network onto the Hyperledger Fabric peer nodes. The business network `blockcerts` is defined in bna file, `blockcerts@0.0.1.bna`. 
`````
composer network install -c PeerAdmin@fabric-network -a blockcerts@0.0.1.bna
`````
In *step eight* we start the blockchain business network
`````
composer network start --networkName admin --networkVersion 0.0.1 -A admin -S adminpw -c PeerAdmin@fabric-network
`````
In *step nine* we import the business network card for the business network administrator
`````
composer card import -f admin@blockcerts.card
`````
In *step ten* we test the connection to the blockchain business network
`````
composer network ping -c admin@blockcerts
`````

## Interacting with the business network using the REST server 

To allow users to log-in with the google api we need first to install (you only need to do this once) the [passport](http://www.passportjs.org/).
`````
npm install -g passport-google-oauth2
`````
To create the REST API run the following command: 
`````
composer-rest-server  -c admin@blockcerts -n never -p 3001
`````
use `admin@blockcerts` as the card name.

In a different console we must start a second REST server
`````
export COMPOSER_PROVIDERS='{    "google": {        "provider": "google",        "module": "passport-google-oauth2",        "clientID": "449143484410-cd3p44o8qgbcihfmck8lu4uj6s5t4c0j.apps.googleusercontent.com",        "clientSecret": "YyEbhukLeI1ndcbpJQVpn3c4",        "authPath": "/auth/google",        "callbackURL": "/auth/google/callback",        "scope": "https://www.googleapis.com/auth/plus.login",        "successRedirect": "http://localhost:4200/callback",        "failureRedirect": "/"    }}'
`````
`````
composer-rest-server -c admin@blockcerts -n never -a true -m true -w true
`````
use `admin@blockcerts` as the card name.


## Front-end based on Angular application

In order to build the user interfaces for this business network 

Navigate to the front-end application folder. Check that npm is installed by running
`````
npm -v
`````
otherwise run. Although npm might already be installed, re-intalling npm is important to update any dependencies.
`````
npm install
`````
Once the installation is complete run,
`````
npm start
`````
and navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files. 

Once the app is loaded log-in with gmail account and create administrator then follow the instructions to create the certificate template, personalize the certificates and verify the certificates. 

Note: in order for the log-out to work on the front-end we must modify the composer-rest-server source code:
First, navigate to the file home/nvm/versions/node/v8.9.0/lib/node_modules/composer-rest-server/server/server.js
on line 162 (//Add a GET handler for logging out.) it should say,
`````
res.redirect('http://localhost:4200/');
`````
This guarantees that when logging out form the administrator it will return to the external user view. External user are only able to verify existing certificates using the id. 

## Destroy a previous set up
After testing the bna desgined with Composer and deployed onto Fabric it is important to tidy up by stopping fabric. Navigate to the folder where you initially started the Hyperledger Fabric network.

`````
./stopFabric.sh
./teardownFabric.sh
`````
delete the composer cards
`````
composer card delete -c name
`````
delete the file sytem card store
`````
rm -fr ~/.composer
`````
and clear the docker cointainers.

`````
./teardownAllDocker.sh
`````
Select option 1- Kill and remove only the containers. Then delete the images created, 
`````
docker rmi $(docker images dev-* -q)
`````