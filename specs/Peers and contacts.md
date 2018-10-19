# Peers and contacts

## Nomenclature

- `identity key`: Ed25519 public signature key, possibly encoded as a string
- `identity key pair`: Ed25519 public and secret signature keys
- `identity class`: JS class in the daemon handling the logic for identities, notably storing the `identity key`
- `local ID`: local string identifier for data stored in the vault. IDs can be generated to alias references uniquely for identities and/or apps.
- `UserIdentity`: class extending the `identity class`, responsible for storing public data about users, notably `peering information`
- `OwnIdentity`: class extending the `identity class` and representing one of the user's identities, storing its `identity key pair`
- `broadcast communication`: one-way communication channel from one `peer` to any potential recipient, it can be either:
  - `public` when messages are signed by the author but not encrypted (example: public data Swarm feed)
  - `private` when messages are encrypted with the recipient's public key (example: first contact message over PSS using a partial or no address).
- `peer-to-peer communication`: communication channel between two `peers`, either:
  - `asymmetric`, such as an encrypted Swarm feed (Alice can read Bob's messages encrypted with Alice's public key if she knows about his feed, but can't send a message to Bob).
  - `symmetric` after first contact happened and both Alice and Bob can read and send messages to each other (example: PSS channel).
- `peering information`: any data such as Ethereum public key, Swarm address, Swarm feed hash, ENS domain... that can be used to bootstrap "first contact" with a peer
- `peer`: any other "human user" in the network that `peer-to-peer communication` can be established with, an `UserIdentity` instance containing `peering information` can be treated as a `peer`
- `contact`: a `peer` with established `symmetric communication`

## Communication patterns examples

|            | Public                       | Private       |
| ---------- | ---------------------------- | ------------- |
| Asymmetric | Broadcasting                 | First contact |
| Symmetric  | Contract / "finger-pointing" | Peer-to-peer  |

## Data structures

- `Peer` class contains `OwnIdentity` and `UserIdentity` references (`local ID`) and possible existing subscriptions to bootstrap (such as PSS topic or Swarm feed hash used for first contact information). It might also contain additional information such as the public feeds known for this user.
- `Contact` class extends `Peer` with additional information needed for symmetric communication (PSS topics, shared keys, ...)

## First contact flow

1.  Alice decides she wants to be in contact with Bob. She uses trusted contact UI in the launcher to setup her `peering information`.
1.  Alice can choose what `peering information` she wants to provide. This information will contain her encryption public key for first contact, but can contain other information that may be useful for potential contacts, such as an username and wallet address. This information will be available publicly so it should be limited to what Alice is comfortable sharing.
1.  After Alice has her `peering information` setup, a Swarm feed is created by the daemon and its hash can be used to retrieve Alice's `peering information`. The daemon will listen on the relevant first contact channels setup (PSS, blockchain...) as long as it is running.
1.  Alice provide Bob her `peering information` feed hash out of band (business card, email, ...).
1.  Bob adds Alice's `peering information` using the launcher trusted UI or an app using the relevant SDK method.
1.  Bob's daemon creates a `symmetric peer-to-peer communication` channel with Alice and starts listening to it. It sends the channel information to Alice's first contact channel.
1.  Alice's daemon receives Bob's contact request, adds Bob as a `peer` in Alice's vault and notify Alice's client (the launcher) of it.
1.  Alice's can accept or decline Bob's request.
1.  Once Alice accepts Bob's contact request, Bob is set as a `contact` in Alice's vault. Alice's daemon will start listening on the `symmetric peer-to-peer communication` channel established with Bob, and notify Bob's of the accepted contact request.
1.  Bob's daemon receives Alice's daemon message in the `symmetric peer-to-peer communication` channel, sets Alice as a `contact` in the vault and notify Bob's client of the accepted contact request.
