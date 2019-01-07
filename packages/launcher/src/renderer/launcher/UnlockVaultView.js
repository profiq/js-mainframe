//@flow

import React, { Component } from 'react'
import { ActivityIndicator } from 'react-native'

import { Button, TextField, Row, Column } from '@morpheus-ui/core'
import CircleArrowRight from '@morpheus-ui/icons/CircleArrowRight'
import { Form, type FormSubmitPayload } from '@morpheus-ui/forms'

import styled from 'styled-components/native'

import OnboardContainer from '../UIComponents/OnboardContainer'

import type { VaultsData } from '../../types'

import rpc from './rpc'

type Props = {
  vaultsData: VaultsData,
  onUnlockVault: () => void,
}

type State = {
  error?: ?string,
  awaitingResponse?: boolean,
  lastTry?: ?string,
}

const FormContainer = styled.View`
  max-width: 260px;
`

export default class UnlockVaultView extends Component<Props, State> {
  state = {}

  onSubmit = (payload: FormSubmitPayload) => {
    if (payload.valid) {
      const { password } = payload.fields
      this.unlockVault(password)
    }
  }

  async unlockVault(password: string) {
    this.setState({
      awaitingResponse: true,
    })
    try {
      await rpc.openVault(this.props.vaultsData.defaultVault, password)
      this.props.onUnlockVault()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(err)
      this.setState({
        awaitingResponse: false,
        error:
          'Failed to unlock vault, please check you entered the correct password.',
        lastTry: password,
      })
    }
  }

  passwordValidation = ({ value }: FieldValidateFunctionParams) => {
    if (value && value === this.state.lastTry) {
      return this.state.error
    }
  }

  render() {
    const action = this.state.awaitingResponse ? (
      <ActivityIndicator />
    ) : (
      <Button
        title="UNLOCK"
        variant="onboarding"
        Icon={CircleArrowRight}
        testID="vault-manager-unlock-button"
        submit
      />
    )
    return (
      <OnboardContainer
        title="Welcome"
        description="Enter your password to unlock your vault.">
        <FormContainer>
          <Form onSubmit={this.onSubmit}>
            <Row size={1} top>
              <Column>
                <TextField
                  autoFocus
                  label="Password"
                  name="password"
                  type="password"
                  testID="vault-manager-unlock-input"
                  validation={this.passwordValidation}
                  required
                />
              </Column>
            </Row>
            <Row size={2} top>
              <Column styles="align-items:flex-end;" smOffset={1}>
                {action}
              </Column>
            </Row>
          </Form>
        </FormContainer>
      </OnboardContainer>
    )
  }
}
