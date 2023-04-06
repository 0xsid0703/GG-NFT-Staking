# GG-NFT-Staking

Gator Gang NFT Staking is a NFT Staking platform, where GG holders can earn an exclusive share of community revenue just by staking Gators. Legendaries and collecting all squads will unlock multipliers.

The staking platform will allow users to stake their Gator Gang NFTs and earn a share of the daily EG Token Volume.

The users can stake:

1. Legendary NFT

2. Common NFT

All NFTs are displayed by category. i.e Legendary, bling squad, adventure squad etc

Users can unstake:

1. Legendary NFTs

2. Common NFTs

3. EG Token Rewards

The portal has the ability to identify an NFT based on its trait. i.e whether an NFT is Legendary, adventure squad, bling squad, etc.

## Smart Contract

1. The smart contract allows a user to stake a gator gang NFT.
2. The smart contract stores information about an NFT.
  - Legendary: Yes/No
  - Common: Yes/No
  - Squad: Adventure, Bling, Business, Chill, Love, Misfit, Party, Space.
  - All squad holders: Yes/No (Does the holder have one NFT from each squad, excluding legendary?) You can only hold one set of All 8. If you have 2 sets of all 8 for example, the first set makes you an All-Squad holder but the remaining 8 only count as common NFTs.There are 8 squads in total. 
3. There are 64 legendaries.
4. If a person collects one of each squad (excluding legendaries), they are an all-squad holder.
5. The smart contract allows the admin to distribute rewards in the form of EG tokens.
6. Holders can stake or unstake a single NFT, or multiple NFTs. 

## Reward Pools

There are 3 reward pools.

1. Token Share to Legendary holders
2. Token Share to All squad holders
3. Token Share to common NFT holders

The smart contract owner can set a percentage reward for each pool. For example:

1. Legendary - 45%
2. All Squad - 45%
3. Common - 10%

When admin distributes rewards, they are given to all holders based on:

1. Type of NFT they have staked
2. Total NFTs staked on the platform
3. Total reward from each pool.


## Example 1:

A user has staked:

1. 3 Legendary 
2. 15 Common NFTs. 
3. He is an All-Squad holder as he has one NFT from each squad.
4. He also has 5 unstaked NFTs (In the wallet, but not staked). These unstaked NFTs are ignored when calculating rewards.

Smart Contract Calculates this user stats to be:

1. totalNFTCountForHolder: 18
2. isLegendaryStaker: Yes
3. stakedLegendaryCountForHolder: 3
4. isAllSquadStaker: Yes
5. commonNFTHolder: Yes
6. commonNFTCountforHolder: 7 (15 - 8 from All-Squad)

Smart Contract Also Calculates:

1. totalLegendaryStaked: 20 (total of all legendaries staked)
2. totalAllSquadHolders: 50 (total AllSquad holders)
3. totalCommonNFTsStaked: 161 (total of all common NFTs staked)

Admin Distributes Rewards: 100,000 EG tokens to all users.

1. Legendary Pool - 45,000 EG (45%)
2. All Squad Pool - 45,000 EG (45%)
3. Common Pool - 10,000 EG (10%)

Our User gets: **8084.78 EG Tokens**

1. From Legendary Pool - 6750 (3/20 * 45000)
2. All Squad Pool - 900 (1/50 * 45000)
3. Common Pool - 434.78 (7/161 * 10000)

## Example 2:

A user has staked:

1. 2 Legendary 
2. 7 Common NFTs. 
3. He is NOT an All-Squad holder. 
4. He also has 2 unstaked NFTs (In the wallet, but not staked). These unstaked NFTs are ignored when calculating rewards.

Smart Contract Calculates this user stats to be:

1. totalNFTCountForHolder: 9
2. isLegendaryHolder: Yes
3. legendaryCountForHolder: 2
4. isAllSquadHolder: No
5. commonNFTHolder: Yes
6. commonNFTCountforHolder: 7 

Smart Contract Also Calculates:

1. totalLegendaryStaked: 20 (total of all legendaries staked)
2. totalAllSquadHolders: 50 (total AllSquad holders)
3. totalCommonNFTsStaked: 161 (total of all common NFTs staked. Calculate commonNFTCountforHolder for all holders)

Admin Distributes Rewards (distributeRewards): **100,000 EG tokens to all users.**

1. Legendary Pool - 45,000 EG (45%)
2. All Squad Pool - 45,000 EG (45%)
3. Common Pool - 10,000 EG (10%)

Our User gets: **4934.78 EG Tokens**

1. From Legendary Pool - 4500 (2/20 * 45000)
2. All Squad Pool - 0 
3. Common Pool - 434.78 (7/161 * 10000)

## Example 3:

A user has staked:

1. 0 Legendary 
2. 20 Common NFTs. 
3. He is an all Squad Holder but has accumulated two All Squads in same wallet. 


Smart Contract Calculates this user stats to be:

1. totalNFTCountForHolder: 20
2. isLegendaryHolder: No
3. legendaryCountForHolder: 0
4. isAllSquadHolder: Yes
5. commonNFTHolder: Yes
6. commonNFTCountforHolder: 12

Smart Contract Also Calculates:

1. totalLegendaryStaked: 20 (total of all legendaries staked)
2. totalAllSquadHolders: 50 (total AllSquad holders)
3. totalCommonNFTsStaked: 161 (total of all common NFTs staked. Calculate commonNFTCountforHolder for all holders)

Admin Distributes Rewards (distributeRewards): **100,000 EG tokens to all users.**

1. Legendary Pool - 45,000 EG (45%)
2. All Squad Pool - 45,000 EG (45%)
3. Common Pool - 10,000 EG (10%)

Our User gets: **1645.34 EG Tokens**

1. From Legendary Pool - 0 (0/20 * 45000)
2. All Squad Pool - 900 (1/50 * 45000)
3. Common Pool - 745.34 (12/161 * 10000)

Note: Only 1 All Squad holder is allowed per wallet. The user in Example 3 can send his second All Squad to another wallet for staking to get a higher reward. If not, all NFTs after the first All Squad will be treated as common NFTs and will get a lower reward.

## Withdraw Rewards
User can unstake the EG rewards received. If they do, they will pay a 5% fee. The fee can be set to a maximum of 10%. This fee is sent to admin Wallet and then distributed to all existing GG Stakers in the next admin drop.
