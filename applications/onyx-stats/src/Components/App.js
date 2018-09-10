// @flow

import React, { Component } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native-web'
import MainframeSDK from '@mainframe/sdk'

import Logo from '../../assets/images/mainframe-logo.svg'
import StakingGraph from './StakingGraph'
import StakingTimeline from './StakingTimeline'
import Text from './ui-kit/Text'
import colors from './ui-kit/Colors'

type State = {
  stakingData?: Array<Object>,
  requestErr?: string,
}

export default class App extends Component<null, State> {
  sdk: MainframeSDK

  constructor() {
    super()
    this.sdk = new MainframeSDK()
    this.state = {}
  }

  componentDidMount() {
    this.getEvents()
  }

  async getEvents() {
    const abi = [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            name: 'owner',
            type: 'address',
          },
          {
            indexed: false,
            name: 'whitelistAddress',
            type: 'address',
          },
        ],
        name: 'Staked',
        type: 'event',
      },
    ]
    const mfTokenAddr = '0xe3C2130530D77418b3e367Fe162808887526e74D'
    try {
      const latestBlock = await this.sdk.blockchain.getLatestBlock()
      const res = await this.sdk.blockchain.getContractEvents(
        mfTokenAddr,
        abi,
        'Staked',
        { fromBlock: 5916157, toBlock: latestBlock },
      )
      const data = this.formatData(res)
      this.setState({
        stakingData: data,
      })
    } catch (err) {
      this.setState({ requestErr: err })
    }
  }

  formatData(events: Array<Object>) {
    if (!events || !events.length) {
      return []
    }
    let block = Math.floor(events[0].blockNumber / 10000) * 10000
    console.log('start block: ', block)
    console.log('total: ', events.length)
    const blockRange = 6000
    const data = events.reduce((res, e) => {
      const blockLimit = block + blockRange
      if (e.blockNumber < blockLimit) {
        const rangeKey = `${block}`
        if (res[rangeKey]) {
          res[rangeKey].push(e)
        } else {
          res[rangeKey] = [e]
        }
      } else {
        block = blockLimit
        const rangeKey = `${block}`
        res[rangeKey] = [e]
      }
      return res
    }, {})
    console.log('data: ', data)
    let counts = ''

    Object.keys(data).forEach(key => {
      const value = data[key]
      counts = counts + `${key},${value.length}\n`
    })
    console.log('counts: ', counts)

    const graphData: Array<Object> = Object.keys(data).map(key => {
      const value = data[key]
      return {
        name: key,
        transactions: value.length,
        events: value,
      }
    })
    return graphData
  }

  render() {
    let content
    if (this.state.requestErr) {
      content = (
        <View style={styles.errorContainer}>
          <Text style={styles.errorLabel}>
            Sorry, there was a problem reading from the blockchain
          </Text>
        </View>
      )
    } else {
      content = !this.state.stakingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : (
        <View>
          <StakingGraph graphData={this.state.stakingData} />
          <StakingTimeline stakingData={this.state.stakingData} />
        </View>
      )
    }
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.header}>
              <Logo />
              <Text style={styles.title}>Onyx Staking</Text>
              <Text style={styles.descriptionLabel}>
                Onyx staking transactions per 1000 blocks
              </Text>
            </View>
            {content}
          </ScrollView>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    backgroundColor: colors.darkBlueColor,
  },
  header: {
    marginTop: 25,
    width: '100%',
    backgroundColor: colors.darkBlueColor,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.darkBlueColor,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 30,
    paddingBottom: 15,
    color: colors.whiteColor,
  },
  mfLogo: {
    width: 100,
    height: 20,
  },
  scrollView: {
    flex: 1,
    width: 600,
  },
  descriptionLabel: {
    color: colors.lightGreyBlue,
    fontSize: 14,
  },
  loadingContainer: {
    paddingTop: 100,
  },
  errorContainer: {
    marginTop: 60,
    padding: 30,
    textAlign: 'center',
    backgroundColor: colors.extraDarkBlue,
  },
  errorLabel: {
    color: colors.redColor,
  },
})
