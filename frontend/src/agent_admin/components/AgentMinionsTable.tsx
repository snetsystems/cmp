// Libraries
import React, {PureComponent} from 'react'
import _ from 'lodash'
import memoize from 'memoize-one'

// Components
import SearchBar from 'src/hosts/components/SearchBar'
import {AgentMinions} from 'src/agent_admin/containers/AgentMinions'
import AgentMinionsTableRow from 'src/agent_admin/components/AgentMinionsTableRow'
import FancyScrollbar from 'src/shared/components/FancyScrollbar'
import PageSpinner from 'src/shared/components/PageSpinner'

// Constants
import {AGENT_MINION_TABLE_SIZING} from 'src/agent_admin/constants/tableSizing'

// Types
import {RemoteDataState, ShellInfo} from 'src/types'
import {Minion, SortDirection} from 'src/agent_admin/type'

// Decorators
import {ErrorHandling} from 'src/shared/decorators/errors'

export interface Props {
  minions: Minion[]
  minionsPageStatus: RemoteDataState
  focusedHost: string
  onClickModal: ({}) => object
  onClickTableRow: AgentMinions['onClickTableRowCall']
  handleWheelKeyCommand: (host: string, cmdstatus: string) => void
  handleShellModalOpen?: (shell: ShellInfo) => void
  handleShellModalClose: () => void
}

interface State {
  searchTerm: string
  sortDirection: SortDirection
  sortKey: string
}

@ErrorHandling
class AgentMinionsTable extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      searchTerm: '',
      sortDirection: SortDirection.ASC,
      sortKey: 'host',
    }
  }

  public getSortedHosts = memoize(
    (
      minions: Minion[],
      searchTerm: string,
      sortKey: string,
      sortDirection: SortDirection
    ) => this.sort(this.filter(minions, searchTerm), sortKey, sortDirection)
  )

  public filter(allHosts: Minion[], searchTerm: string): Minion[] {
    const filterText = searchTerm.toLowerCase()
    return allHosts.filter(h => {
      return h.host.toLowerCase().includes(filterText)
    })
  }

  public sort(
    hosts: Minion[],
    key: string,
    direction: SortDirection
  ): Minion[] {
    switch (direction) {
      case SortDirection.ASC:
        return _.sortBy(hosts, e => e[key])
      case SortDirection.DESC:
        return _.sortBy(hosts, e => e[key]).reverse()
      default:
        return hosts
    }
  }

  public updateSearchTerm = (searchTerm: string) => {
    this.setState({searchTerm})
  }

  public updateSort = key => () => {
    const {sortKey, sortDirection} = this.state
    if (sortKey === key) {
      const reverseDirection =
        sortDirection === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC
      this.setState({sortDirection: reverseDirection})
    } else {
      this.setState({sortKey: key, sortDirection: SortDirection.ASC})
    }
  }

  public sortableClasses = key => {
    const {sortKey, sortDirection} = this.state
    if (sortKey === key) {
      if (sortDirection === SortDirection.ASC) {
        return 'hosts-table--th sortable-header sorting-ascending'
      }
      return 'hosts-table--th sortable-header sorting-descending'
    }
    return 'hosts-table--th sortable-header'
  }

  private get AgentTableHeader() {
    return this.AgentTableHeaderEachPage
  }

  private get AgentTableContents() {
    const {minions, minionsPageStatus} = this.props
    const {sortKey, sortDirection, searchTerm} = this.state
    const sortedHosts = this.getSortedHosts(
      minions,
      searchTerm,
      sortKey,
      sortDirection
    )

    if (minionsPageStatus === RemoteDataState.Error) {
      return this.ErrorState
    }

    if (minionsPageStatus === RemoteDataState.Done && minions.length === 0) {
      return this.NoHostsState
    }

    if (
      minionsPageStatus === RemoteDataState.Done &&
      sortedHosts.length === 0
    ) {
      return this.NoSortedHostsState
    }

    return this.AgentTableWithHosts
  }

  private get LoadingState(): JSX.Element {
    return (
      <div
        style={{
          position: 'absolute',
          zIndex: 3,
          backgroundColor: 'rgba(0,0,0,0.5)',
          width: '100%',
          height: '100%',
        }}
      >
        <PageSpinner />
      </div>
    )
  }

  private get ErrorState(): JSX.Element {
    return (
      <div className="agent--state generic-empty-state">
        <h4 style={{margin: '90px 0'}}>There was a problem loading hosts</h4>
      </div>
    )
  }

  private get NoHostsState(): JSX.Element {
    return (
      <div className="agent--state generic-empty-state">
        <h4 style={{margin: '90px 0'}}>No Hosts found</h4>
      </div>
    )
  }

  private get NoSortedHostsState(): JSX.Element {
    return (
      <div className="agent--state generic-empty-state">
        <h4 style={{margin: '90px 0'}}>
          There are no hosts that match the search criteria
        </h4>
      </div>
    )
  }

  public render() {
    const {minionsPageStatus} = this.props
    return (
      <div className="panel">
        {minionsPageStatus === RemoteDataState.Loading
          ? this.LoadingState
          : null}
        <div className="panel-heading">
          <h2 className="panel-title">{this.AgentTitle}</h2>
          <span>
            If "RDP Launcher" has not been installed, download HERE [
            <a href="https://github.com/richard-green/MstscLauncher/releases/download/1.1.0/MstscLauncher.exe">
              <span className="icon download" />
            </a>
            ] and save it your safe path, <br />
            Then run it <span className="emphasis-word">JUST ONCE</span> as an{' '}
            <span className="caution-word">administrator</span> mode.
          </span>
          <SearchBar
            placeholder="Filter by Host..."
            onSearch={this.updateSearchTerm}
          />
        </div>
        <div className="panel-body">{this.AgentTableContents}</div>
      </div>
    )
  }

  private get AgentTitle() {
    const {minions} = this.props
    const {sortKey, sortDirection, searchTerm} = this.state
    const sortedHosts = this.getSortedHosts(
      minions,
      searchTerm,
      sortKey,
      sortDirection
    )

    const hostsCount = sortedHosts.length
    if (hostsCount === 1) {
      return `1 Minions`
    }
    return `${hostsCount} Minions`
  }

  private get AgentTableHeaderEachPage() {
    const {
      HostWidth,
      OSWidth,
      OSVersionWidth,
      IPWidth,
      StatusWidth,
      OperationWidth,
    } = AGENT_MINION_TABLE_SIZING
    return (
      <div className="hosts-table--thead">
        <div className="hosts-table--tr">
          <div
            onClick={this.updateSort('host')}
            className={this.sortableClasses('name')}
            style={{width: HostWidth}}
          >
            Host
            <span className="icon caret-up" />
          </div>
          <div
            onClick={this.updateSort('os')}
            className={this.sortableClasses('os')}
            style={{width: OSWidth}}
          >
            OS
            <span className="icon caret-up" />
          </div>
          <div
            onClick={this.updateSort('osVersion')}
            className={this.sortableClasses('osVersion')}
            style={{width: OSVersionWidth}}
          >
            OS Version
            <span className="icon caret-up" />
          </div>

          <div
            onClick={this.updateSort('ip')}
            className={this.sortableClasses('ip')}
            style={{width: IPWidth}}
          >
            IP
            <span className="icon caret-up" />
          </div>
          <div
            onClick={this.updateSort('status')}
            className={this.sortableClasses('status')}
            style={{width: StatusWidth}}
          >
            Status
            <span className="icon caret-up" />
          </div>
          <div
            className="hosts-table--th list-type"
            style={{width: OperationWidth}}
          >
            Operation
          </div>
          <div
            className="hosts-table--th list-type"
            style={{width: OperationWidth}}
          >
            Console
          </div>
        </div>
      </div>
    )
  }

  private get AgentTableWithHosts() {
    const {
      minions,
      onClickTableRow,
      onClickModal,
      handleWheelKeyCommand,
      focusedHost,
      handleShellModalOpen,
      handleShellModalClose,
    } = this.props
    const {sortKey, sortDirection, searchTerm} = this.state

    const sortedHosts: [] = this.getSortedHosts(
      minions,
      searchTerm,
      sortKey,
      sortDirection
    )

    return (
      <>
        <div className="hosts-table">
          {this.AgentTableHeader}
          {sortedHosts.length > 0 ? (
            <FancyScrollbar
              children={sortedHosts.map((m: Minion, i: number) => (
                <AgentMinionsTableRow
                  key={i}
                  idx={i}
                  minions={m}
                  onClickTableRow={onClickTableRow}
                  onClickModal={onClickModal}
                  handleWheelKeyCommand={handleWheelKeyCommand}
                  focusedHost={focusedHost}
                  handleShellModalOpen={handleShellModalOpen}
                  handleShellModalClose={handleShellModalClose}
                />
              ))}
              className="hosts-table--tbody"
            />
          ) : null}
        </div>
      </>
    )
  }
}

export default AgentMinionsTable
