import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { HotKeyRegistry } from 'insomnia-common';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG } from '../../../common/constants';
import { Button } from '../base/button';
import { SidebarCreateDropdown } from './sidebar-create-dropdown';

interface Props {
  requestCreate: () => void;
  requestGroupCreate: () => void;
  requestGroupCollapseAll: () => void;
  hotKeyRegistry: HotKeyRegistry;
}

const SidebarRequestActionsContainer = styled.div`
  display: flex;
  justify-content: space-evenly;
  font-size: var(--font-size-sm);
  box-sizing: border-box;

  .btn{
    margin-right: var(--padding-xxs);
    border-radius: var(--radius-md);
    margin-left: var(--padding-xxs);
    margin-bottom: var(--padding-sm);
    height: var(--line-height-xxs)!important;
  }
`;

@autoBindMethodsForReact(AUTOBIND_CFG)
export class SidebarRequestActions extends PureComponent<Props> {

  _handleRequestCreate() {
    this.props.requestCreate();
  }

  _handleRequestGroupCreate() {
    this.props.requestGroupCreate();
  }

  _handleCollapseAll() {
    this.props.requestGroupCollapseAll();
  }

  render() {
    const { hotKeyRegistry } = this.props;
    return (
      <SidebarRequestActionsContainer>
        <Button className="btn" onClick={this._handleCollapseAll}>
          <i className="fa fa-compress" />
        </Button>
        <SidebarCreateDropdown
          handleCreateRequest={this._handleRequestCreate}
          handleCreateRequestGroup={this._handleRequestGroupCreate}
          hotKeyRegistry={hotKeyRegistry}
        />
      </SidebarRequestActionsContainer>
    );
  }
}
