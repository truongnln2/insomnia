import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { HotKeyRegistry } from 'insomnia-common';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG } from '../../../common/constants';
import { hotKeyRefs } from '../../../common/hotkeys';
import { executeHotKey } from '../../../common/hotkeys-listener';
import type { Environment } from '../../../models/environment';
import type { Workspace } from '../../../models/workspace';
import { Dropdown } from '../base/dropdown/dropdown';
import { DropdownButton } from '../base/dropdown/dropdown-button';
import { DropdownDivider } from '../base/dropdown/dropdown-divider';
import { DropdownItem } from '../base/dropdown/dropdown-item';
import { KeydownBinder } from '../keydown-binder';
import { Tooltip } from '../tooltip';

const StyledDropdownContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  & > .dropdown__text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  i.fa {
    // Bump the drop down caret down a bit
    position: relative;
    top: 1px;
  }
`;

interface Props {
  handleChangeEnvironment: Function;
  workspace: Workspace;
  environments: Environment[];
  environmentHighlightColorStyle: string;
  hotKeyRegistry: HotKeyRegistry;
  className?: string;
  activeEnvironment?: Environment | null;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class ChooseEnvironmentsDropdown extends PureComponent<Props> {
  _dropdown: Dropdown | null = null;

  _handleActivateEnvironment(environmentId: string) {
    this.props.handleChangeEnvironment(environmentId);
  }

  _setDropdownRef(n: Dropdown) {
    this._dropdown = n;
  }

  renderEnvironmentItem(environment: Environment) {
    return (
      <DropdownItem
        key={environment._id}
        value={environment._id}
        onClick={this._handleActivateEnvironment}
      >
        <i
          className="fa fa-random"
          style={{
            // @ts-expect-error -- TSCONVERSION don't set color if undefined
            color: environment.color,
          }}
        />
        Use <strong>{environment.name}</strong>
      </DropdownItem>
    );
  }

  _handleKeydown(e: KeyboardEvent) {
    executeHotKey(e, hotKeyRefs.ENVIRONMENT_SHOW_SWITCH_MENU, () => {
      this._dropdown?.toggle(true);
    });
  }

  render() {
    const {
      className,
      workspace,
      environments,
      activeEnvironment,
      environmentHighlightColorStyle,
      hotKeyRegistry,
      ...other
    } = this.props;
    // NOTE: Base environment might not exist if the users hasn't managed environments yet.
    const baseEnvironment = environments.find(e => e.parentId === workspace._id);
    const subEnvironments = environments
      .filter(e => e.parentId === (baseEnvironment && baseEnvironment._id))
      .sort((e1, e2) => e1.metaSortKey - e2.metaSortKey);
    let description;

    if (!activeEnvironment || activeEnvironment === baseEnvironment) {
      description = 'No Environment';
    } else {
      description = activeEnvironment.name;
    }

    return (
      <KeydownBinder onKeydown={this._handleKeydown}>
        <Dropdown
          ref={this._setDropdownRef}
          {...(other as Record<string, any>)}
          className={className}
        >
          <DropdownButton className="btn btn--super-compact no-wrap">
            <StyledDropdownContainer>
              {!activeEnvironment && subEnvironments.length > 0 && (
                <Tooltip
                  message="No environments active. Please select one to use."
                  className="space-right"
                  position="right"
                >
                  <i className="fa fa-exclamation-triangle notice" />
                </Tooltip>
              )}
              <div className="dropdown__text">
                {activeEnvironment?.color && environmentHighlightColorStyle === 'sidebar-indicator' ? (
                  <i
                    className="fa fa-tags space-right"
                    style={{
                      color: activeEnvironment.color,
                    }}
                  />
                ) : null}
                {description}
              </div>
              <i className="space-left fa fa-caret-down" />
            </StyledDropdownContainer>
          </DropdownButton>

          <DropdownDivider>Activate Environment</DropdownDivider>
          {subEnvironments.map(this.renderEnvironmentItem)}

          <DropdownItem value={null} onClick={this._handleActivateEnvironment}>
            <i className="fa fa-empty" /> No Environment
          </DropdownItem>
        </Dropdown>
      </KeydownBinder>
    );
  }
}
