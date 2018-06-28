//@flow

import React, { Component } from 'react'
import { TextInput, StyleSheet } from 'react-native-web'

import { type Style } from '../types'
import colors from '../colors'

type Props = {
  style?: number | Array<boolean | number> | Object,
}

export default class MFTextInput extends Component<Props> {
  render() {
    const style = [styles.input, this.props.style]
    return <TextInput {...this.props} style={style} />
  }
}

const styles = StyleSheet.create({
  input: {
    padding: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.LIGHT_GREY_E8,
    marginRight: 15,
  },
})
