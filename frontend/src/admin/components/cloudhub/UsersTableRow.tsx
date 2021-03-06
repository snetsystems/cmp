import React, {PureComponent} from 'react'

import Dropdown from 'src/shared/components/Dropdown'
import ConfirmButton from 'src/shared/components/ConfirmButton'

import {ErrorHandling} from 'src/shared/decorators/errors'
import {USER_ROLES} from 'src/admin/constants/cloudhubAdmin'
import {USERS_TABLE} from 'src/admin/constants/cloudhubTableSizing'
import {User, BasicUser, Role, Organization} from 'src/types'

interface DropdownRole {
  text: string
  name: string
}

interface Props {
  user: User
  organization: Organization
  onChangeUserRole: (User, Role) => void
  onDelete: (User) => void
  meID: string
  onResetUserPassword: (name: string) => void
  onChangeUserLock: (user: BasicUser) => void
}

@ErrorHandling
class UsersTableRow extends PureComponent<Props> {
  public render() {
    const {user, onChangeUserRole} = this.props
    const {colRole, colProvider, colScheme, colActions} = USERS_TABLE
    const isUserLock = user?.['locked']

    return (
      <tr className={'cloudhub-admin-table--user'}>
        <td>
          {this.isMe ? (
            <strong className="cloudhub-user--me">
              <span className="icon user" />
              {user.name}
            </strong>
          ) : (
            <strong className={isUserLock ? 'cloudhub-user--lock' : null}>
              {isUserLock ? <span className="icon lock" /> : null}
              {user.name}
            </strong>
          )}
        </td>
        <td style={{width: colRole}}>
          <span className="cloudhub-user--role">
            <Dropdown
              items={this.rolesDropdownItems}
              selected={this.currentRole?.name}
              onChoose={onChangeUserRole(user, this.currentRole)}
              buttonColor="btn-primary"
              buttonSize="btn-xs"
              className="dropdown-stretch"
            />
          </span>
        </td>
        <td style={{width: colProvider}}>{user.provider}</td>
        <td style={{width: colScheme}}>{user.scheme}</td>
        <td style={{width: colActions}}>
          <div style={{display: 'flex', justifyContent: 'flex-end'}}>
            {user.provider === 'cloudhub' &&
              this.basicAuthButtons(user as BasicUser)}
            <ConfirmButton
              confirmText={this.confirmationText}
              confirmAction={this.handleDelete}
              size="btn-xs"
              type="btn-danger"
              text="Remove"
              customClass="table--show-on-row-hover"
            />
          </div>
        </td>
      </tr>
    )
  }

  private basicAuthButtons = (user: BasicUser): JSX.Element => {
    return (
      <>
        <div style={{marginRight: '4px'}}>
          <ConfirmButton
            confirmText={
              user?.locked
                ? this.confirmationUserUnlockText
                : this.confirmationUserLockText
            }
            confirmAction={() => {
              this.handleChangeUserLock(user)
            }}
            size="btn-xs"
            type="btn-danger"
            text={`${user.locked ? 'Unlock' : 'Lock'}`}
            customClass="table--show-on-row-hover width-50px"
          />
        </div>
        <div style={{marginRight: '4px'}}>
          <ConfirmButton
            confirmText={this.confirmationPasswordResetText}
            confirmAction={this.handleResetPassword}
            size="btn-xs"
            type="btn-danger"
            text="Reset"
            customClass="table--show-on-row-hover"
          />
        </div>
      </>
    )
  }

  private handleDelete = (): void => {
    const {user, onDelete} = this.props

    onDelete(user)
  }

  private handleResetPassword = (): void => {
    const {user, onResetUserPassword} = this.props

    onResetUserPassword(user.name)
  }

  private handleChangeUserLock = (user: BasicUser): void => {
    const {onChangeUserLock} = this.props

    onChangeUserLock(user)
  }

  private get rolesDropdownItems(): DropdownRole[] {
    return USER_ROLES.map(r => ({
      ...r,
      text: r.name,
    }))
  }

  private get currentRole(): Role {
    const {user, organization} = this.props

    return user.roles.find(role => role.organization === organization.id)
  }

  private get isMe(): boolean {
    const {user, meID} = this.props

    return user.id === meID
  }

  private get confirmationText(): string {
    return 'Remove this user\nfrom Current Org?'
  }

  private get confirmationPasswordResetText(): string {
    return 'Reset this user password\nfrom Current Org?'
  }

  private get confirmationUserUnlockText(): string {
    return 'Would you like to unlock the user?'
  }

  private get confirmationUserLockText(): string {
    return 'Do you want to lock the user?'
  }
}

export default UsersTableRow
