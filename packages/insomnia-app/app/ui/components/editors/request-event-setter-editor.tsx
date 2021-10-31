import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import {
  AUTOBIND_CFG,
} from '../../../common/constants';
import { HandleGetRenderContext, HandleRender, RenderKey } from '../../../common/render';
import * as models from '../../../models';
import { Request } from '../../../models/request';
import { RequestSetter, SetterEventType } from '../../../models/request-setter';
import { STATIC_CONTEXT_SOURCE_NAME } from '../../../templating';
import { Button } from '../base/button';
import { VariableSetterPair } from '../variable-setter-editor/row';
import { WrapperProps } from '../wrapper';
import { SetterEventRowEditor } from './setter-event-row-editor';

interface Props {
  request: Request;
  wrapperProps: WrapperProps;
  handleGetRenderContext: HandleGetRenderContext;
  handleRender: HandleRender;
  nunjucksPowerUserMode: boolean;
  isVariableUncovered: boolean;
}

interface State {
  [SetterEventType.AFTER_RECEIVED_RESPONSE]: RequestSetter[];
  [SetterEventType.BEFORE_SEND_REQUEST]: RequestSetter[];
  [SetterEventType.DURING_SEND_REQUEST]: RequestSetter[];
  variables: any[];
}

const StyledHeaderContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-bottom: var(--padding-sm);
  > h4 {
    width: 100%;
    padding-top: var(--padding-sm);
  }
  > .btn {
    width: auto;
  }
`;

@autoBindMethodsForReact(AUTOBIND_CFG)
export class RequestEventSetterEditors extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      [SetterEventType.AFTER_RECEIVED_RESPONSE]: [],
      [SetterEventType.BEFORE_SEND_REQUEST]: [],
      [SetterEventType.DURING_SEND_REQUEST]: [],
      variables: [],
    };
    this._load();
  }

  async _load() {
    const { request } = this.props;
    const setters = (await models.requestSetter.findByParentId(request._id)) || [];
    const context = await this.props.handleGetRenderContext();
    const variables: RenderKey[] = context.keys.sort((a: any, b: any) => {
      if (a.meta?.type < b.meta?.type) {
        return -1;
      } else if (a.meta?.type > b.meta?.type) {
        return 1;
      } else {
        if (a.meta?.name < b.meta?.name) {
          return -1;
        } else if (a.meta?.name > b.meta?.name) {
          return 1;
        } else {
          return a.name < b.name ? -1 : 1;
        }
      }
    });
    this.setState({
      [SetterEventType.AFTER_RECEIVED_RESPONSE]: setters.filter(s => s.event === SetterEventType.AFTER_RECEIVED_RESPONSE),
      [SetterEventType.BEFORE_SEND_REQUEST]: setters.filter(s => s.event === SetterEventType.BEFORE_SEND_REQUEST),
      [SetterEventType.DURING_SEND_REQUEST]: setters.filter(s => s.event === SetterEventType.DURING_SEND_REQUEST),
      variables: variables.filter(v => v.meta?.type !== STATIC_CONTEXT_SOURCE_NAME),
    });
  }

  async _handleUpdateSetter(setter: RequestSetter, patch: Partial<RequestSetter>) {
    await models.requestSetter.update(setter, patch);
    await this._load();
  }

  async _handleUpdateMetaSort(type: SetterEventType, updatedSetters: VariableSetterPair[]) {
    const { [type]: setters } = this.state;
    const newSetterPrms = updatedSetters
      .map(s => (setters.find(s2 => s2._id === s.id)))
      .map(
        (setter, idx) => {
          if (setter) {
            setter.metaSortKey = idx;
            return models.requestSetter.update(setter, { metaSortKey: idx });
          }
          return null;
        },
      );
    await Promise.all(newSetterPrms);
    this.setState({
      [type]: [...setters],
    });
  }

  async _handleDeleteAllSetter(type: SetterEventType) {
    const { [type]: setters } = this.state;
    const newSetterPrms = setters
      .map(setter => models.requestSetter.remove(setter));
    await Promise.all(newSetterPrms);
    await this._load();
  }

  async _handleDeleteSetter(setter: RequestSetter) {
    await models.requestSetter.remove(setter);
    await this._load();
  }

  async _handleCreateNewSetter(type: SetterEventType) {
    const { request } = this.props;
    await models.requestSetter.create({
      parentId: request._id,
      event: type,
    });
    await this._load();
  }

  render() {
    const {
      handleGetRenderContext,
      handleRender,
      nunjucksPowerUserMode,
      isVariableUncovered,
    } = this.props;
    const {
      [SetterEventType.AFTER_RECEIVED_RESPONSE]: afterResponse,
      [SetterEventType.BEFORE_SEND_REQUEST]: beforeRequest,
      [SetterEventType.DURING_SEND_REQUEST]: duringRequest,
      variables,
    } = this.state;

    return (
      <div className="pad">
        <div className="scrollable">
          <StyledHeaderContainer>
            <h4>Request Data Setters by Events</h4>
            <Button
              onClick={this._load}
              className="btn btn--clicky"
            >
              <i className="fa fa-refresh" /> Reload variables
            </Button>
          </StyledHeaderContainer>
          <SetterEventRowEditor
            eventName={'Before send request'}
            eventType={SetterEventType.BEFORE_SEND_REQUEST}
            handleGetRenderContext={handleGetRenderContext}
            handleRender={handleRender}
            nunjucksPowerUserMode={nunjucksPowerUserMode}
            isVariableUncovered={isVariableUncovered}
            onChange={this._handleUpdateSetter}
            onChangeMetaSort={this._handleUpdateMetaSort}
            pairs={beforeRequest}
            variables={variables}
            onCreate={this._handleCreateNewSetter}
            onDelete={this._handleDeleteSetter}
            onDeleteAll={this._handleDeleteAllSetter}
          />
          <SetterEventRowEditor
            eventName={'During send request'}
            eventType={SetterEventType.DURING_SEND_REQUEST}
            handleGetRenderContext={handleGetRenderContext}
            handleRender={handleRender}
            nunjucksPowerUserMode={nunjucksPowerUserMode}
            isVariableUncovered={isVariableUncovered}
            onChange={this._handleUpdateSetter}
            onChangeMetaSort={this._handleUpdateMetaSort}
            pairs={duringRequest}
            variables={variables}
            onCreate={this._handleCreateNewSetter}
            onDelete={this._handleDeleteSetter}
            onDeleteAll={this._handleDeleteAllSetter}
          />
          <SetterEventRowEditor
            eventName={'After received response'}
            eventType={SetterEventType.AFTER_RECEIVED_RESPONSE}
            handleGetRenderContext={handleGetRenderContext}
            handleRender={handleRender}
            nunjucksPowerUserMode={nunjucksPowerUserMode}
            isVariableUncovered={isVariableUncovered}
            onChange={this._handleUpdateSetter}
            onChangeMetaSort={this._handleUpdateMetaSort}
            pairs={afterResponse}
            variables={variables}
            onCreate={this._handleCreateNewSetter}
            onDelete={this._handleDeleteSetter}
            onDeleteAll={this._handleDeleteAllSetter}
          />
        </div>
      </div>
    );
  }
}
