import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';

import {
  AUTOBIND_CFG, REQUEST_UTIL_TABS_ORDER, REQUEST_UTIL_TABS_TITLE,
} from '../../../common/constants';
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem } from '../base/dropdown';

interface Props {
  className?: string;
  activeTab: string;
  onChange: (tab: string) => void;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class RequestExtendTabDropdown extends PureComponent<Props> {
  async _handleChangeTab(tab: string) {
    const { onChange } = this.props;
    onChange(tab);
  }

  _getDropdownTitle(itemTitle: string) {
    let thisTabTitle = '';
    if (typeof itemTitle === 'string') {
      thisTabTitle = REQUEST_UTIL_TABS_TITLE[itemTitle] || '';
    }
    return thisTabTitle;
  }

  _renderDropdownItem(itemTitle: string, index: number) {
    const { activeTab } = this.props;
    let thisActiveFlg = false;
    let key = '';
    if (typeof itemTitle === 'string') {
      if (typeof activeTab === 'string') {
        if (itemTitle === activeTab) {
          thisActiveFlg = true;
        }
      }
      key = 'util-' + index;
    }
    const iconClass = thisActiveFlg ? 'fa-check' : 'fa-empty';
    return (
      <DropdownItem onClick={this._handleChangeTab} value={itemTitle} key={key}>
        <i className={`fa ${iconClass}`} />
        {this._getDropdownTitle(itemTitle)}
      </DropdownItem>
    );
  }

  render() {
    const { className, activeTab, ...extraProps } = this.props;
    return (
      <Dropdown beside {...extraProps}>
        <DropdownButton className={className}>
          Utils - {this._getDropdownTitle(activeTab)}
          <i className="fa fa-caret-down space-left" />
        </DropdownButton>
        <DropdownDivider>
          <span>
            <i className="fa fa-toolbox" /> Utils
          </span>
        </DropdownDivider>
        {REQUEST_UTIL_TABS_ORDER.map(this._renderDropdownItem)}
      </Dropdown>
    );
  }
}
