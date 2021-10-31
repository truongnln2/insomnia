import { autoBindMethodsForReact } from 'class-autobind-decorator';
import classnames from 'classnames';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG } from '../../../common/constants';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { RequestSetter, SetterEventType, sort as setterSort } from '../../../models/request-setter';
import { Button } from '../base/button';
import { Lazy } from '../base/lazy';
import { PromptButton } from '../base/prompt-button';
import { VariableSetterPair, VariableValueSetterRow } from '../variable-setter-editor/row';

const NAME = 'name';
const VALUE = 'value';
const ENTER = 13;
const BACKSPACE = 8;
const UP = 38;
const DOWN = 40;
const LEFT = 37;
const RIGHT = 39;

interface Props {
  eventName: string;
  eventType: SetterEventType;
  pairs: RequestSetter[];
  variables: any[];
  handleRender: HandleRender;
  handleGetRenderContext: HandleGetRenderContext;
  nunjucksPowerUserMode?: boolean;
  isVariableUncovered?: boolean;
  handleGetAutocompleteValueConstants?: Function;
  maxPairs?: number;
  valuePlaceholder?: string;
  disableDelete?: boolean;
  disableToggle?: boolean;
  readOnlyKey?: boolean;
  ignoreSuggestKey?: boolean;
  onDelete?: Function;
  onDeleteAll?: Function;
  onCreate?: Function;
  onChange: Function;
  onChangeMetaSort: Function;
  className?: string;
  keyWidth?: React.CSSProperties;
}

interface State {
  pairs: VariableSetterPair[];
  isToggled: boolean;
}

const StyledContainer = styled.div`
  padding: var(--padding-xs);
  border-bottom: 1.5px solid var(--hl-xl);

  > .event-header {
    display: flex;
    flex-direction: row;
    align-items: stretch;

    h4 {
      width: 100%;
      padding-top: var(--padding-xs);

      .bubble {
        position: relative;
        bottom: 0.4em;
        font-size: 0.8em;
        min-width: 0.6em;
        background: var(--hl-sm);
        padding: 2px;
        border-radius: 3px;
        display: inline-block;
        text-align: center;
        line-height: 0.8em;
        border: 1px solid var(--hl-xxs);
      }
    }

    .btn {
      width: auto;
    }
  }
`;

@autoBindMethodsForReact(AUTOBIND_CFG)
export class SetterEventRowEditor extends PureComponent<Props, State> {
  _focusedPairId: string | null = null;
  _focusedField: string | null = NAME;
  // @ts-expect-error -- TSCONVERSION being imported as a value but should be usable as a type
  private _rows: VariableValueSetterRow[] = [];
  _triggerTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    // Migrate and add IDs to all pairs (pairs didn't used to have IDs)
    const pairs: VariableSetterPair[] = SetterEventRowEditor._convertPropsPair(props.pairs);
    this.state = {
      pairs,
      isToggled: pairs.length > 0,
    };
  }

  static _convertPropsPair(pairs: RequestSetter[]): VariableSetterPair[] {
    return pairs.sort(setterSort).map(p => ({
      description: p.description,
      disabled: !p.enabled,
      id: p._id,
      propertyName: p.objectKey,
      value: p.setterValue,
      multiline: p.multiline || false,
    }));
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const pairs: VariableSetterPair[] = SetterEventRowEditor._convertPropsPair(nextProps.pairs);
    let isToggled = prevState.isToggled;
    if (!prevState.pairs.length && pairs.length) {
      isToggled = true;
    }
    return {
      ...prevState,
      pairs,
      isToggled,
    };
  }

  // @ts-expect-error -- TSCONVERSION being imported as a value but should be usable as a type
  private _setRowRef(n?: VariableValueSetterRow) {
    // NOTE: We're not handling unmounting (may lead to a bug)
    if (n) {
      this._rows[n.props.pair.id] = n;
    }
  }

  _handleCreateSetter() {
    this.props.onCreate && this.props.onCreate(this.props.eventType);
    this.setState({
      isToggled: true,
    });
  }

  _handleMove(pairToMove, pairToTarget, targetOffset) {
    if (pairToMove.id === pairToTarget.id) {
      // Nothing to do
      return;
    }

    const withoutPair = this.state.pairs.filter(p => p.id !== pairToMove.id);
    let toIndex = withoutPair.findIndex(p => p.id === pairToTarget.id);

    // If we're moving below, add 1 to the index
    if (targetOffset < 0) {
      toIndex += 1;
    }

    const pairs = [
      ...withoutPair.slice(0, toIndex),
      Object.assign({}, pairToMove),
      ...withoutPair.slice(toIndex),
    ];
    this.props.onChangeMetaSort && this.props.onChangeMetaSort(this.props.eventType, pairs);
    this.setState({
      pairs,
    });
  }

  _handleBlurName() {
    this._focusedField = null;
  }

  _handleBlurValue() {
    this._focusedField = null;
  }

  _handleBlurDescription() {
    this._focusedField = null;
  }

  _handleFocusName(pair) {
    this._setFocusedPair(pair);

    this._focusedField = NAME;

    this._rows[pair.id].focusNameEnd();
  }

  _handleFocusValue(pair) {
    this._setFocusedPair(pair);

    this._focusedField = VALUE;

    this._rows[pair.id].focusValueEnd();
  }

  _handleKeyDown(_pair, e, value) {
    if (e.metaKey || e.ctrlKey) {
      return;
    }

    if (e.keyCode === ENTER) {
      this._focusNext(true);
    } else if (e.keyCode === BACKSPACE) {
      if (!value) {
        this._focusPrevious();
      }
    } else if (e.keyCode === DOWN) {
      e.preventDefault();

      this._focusNextPair();
    } else if (e.keyCode === UP) {
      e.preventDefault();

      this._focusPreviousPair();
    } else if (e.keyCode === LEFT) {
      // TODO: Implement this
    } else if (e.keyCode === RIGHT) {
      // TODO: Implement this
    }
  }

  _focusNext(addIfValue = false) {
    if (this.props.maxPairs === 1) {
      return;
    }

    if (this._focusedField === NAME) {
      this._focusedField = VALUE;

      this._updateFocus();
    } else if (this._focusedField === VALUE) {
      this._focusedField = NAME;

      if (addIfValue) {
        this.props.onCreate && this.props.onCreate();
      } else {
        this._focusNextPair();
      }
    }
  }

  _focusPrevious() {
    if (this._focusedField === VALUE) {
      this._focusedField = NAME;

      this._updateFocus();
    } else if (this._focusedField === NAME) {
      this._focusedField = VALUE;

      this._focusPreviousPair();
    }
  }

  _focusNextPair() {
    if (this.props.maxPairs === 1) {
      return;
    }

    const i = this._getFocusedPairIndex();

    if (i === -1) {
      // No focused pair currently
      return;
    }

    if (i >= this.state.pairs.length - 1) {
      // Focused on last one, so add another
      this._handleCreateSetter();
    } else {
      this._setFocusedPair(this.state.pairs[i + 1]);

      this._updateFocus();
    }
  }

  _focusPreviousPair() {
    if (this.props.maxPairs === 1) {
      return;
    }

    const i = this._getFocusedPairIndex();

    if (i > 0) {
      this._setFocusedPair(this.state.pairs[i - 1]);

      this._updateFocus();
    }
  }

  _updateFocus() {
    const pair = this._getFocusedPair();

    const id = pair ? pair.id : 'n/a';
    const row = this._rows[id];

    if (!row) {
      return;
    }

    if (this._focusedField === NAME) {
      row.focusNameEnd();
    } else if (this._focusedField === VALUE) {
      row.focusValueEnd();
    }
  }

  _getPairIndex(pair) {
    if (pair) {
      return this.state.pairs.findIndex(p => p.id === pair.id);
    } else {
      return -1;
    }
  }

  _getFocusedPairIndex() {
    return this._getPairIndex(this._getFocusedPair());
  }

  _getFocusedPair() {
    return this.state.pairs.find(p => p.id === this._focusedPairId) || null;
  }

  _setFocusedPair(pair) {
    if (pair) {
      this._focusedPairId = pair.id;
    } else {
      this._focusedPairId = null;
    }
  }

  _handlePairChange(pair: VariableSetterPair) {
    const setter = this.props.pairs.find(p => p._id === pair.id);
    if (setter && this.props.onChange) {
      const patch: Partial<RequestSetter> = {};
      pair.propertyName && (patch.objectKey = pair.propertyName);
      pair.disabled !== undefined && (patch.enabled = !pair.disabled);
      pair.value && (patch.setterValue = pair.value);
      pair.multiline !== undefined && (patch.multiline = pair.multiline);
      this.props.onChange(setter, patch);
    }
  }

  _handlePairDelete(pair: VariableSetterPair) {
    const setter = this.props.pairs.find(p => p._id === pair.id);
    if (setter && this.props.onDelete) {
      this.props.onDelete(setter);
    }
  }

  _handleDeleteAllSetter() {
    if (this.props.onDeleteAll) {
      this.props.onDeleteAll(this.props.eventType);
      this.setState({
        isToggled: false,
      });
    }
  }

  _handleToggle() {
    this.setState({
      isToggled: !this.state.isToggled,
    });
  }

  componentDidUpdate() {
    this._updateFocus();
  }

  render() {
    const {
      eventName,
      maxPairs,
      className,
      variables,
      valuePlaceholder,
      handleRender,
      handleGetRenderContext,
      nunjucksPowerUserMode,
      isVariableUncovered,
      handleGetAutocompleteValueConstants,
      readOnlyKey,
      ignoreSuggestKey,
      disableDelete,
      disableToggle,
      keyWidth,
    } = this.props;
    const { pairs, isToggled } = this.state;
    const classes = classnames('key-value-editor', 'wide', className);
    return (
      <StyledContainer>
        <div className="event-header">
          <Button
            onClick={this._handleToggle}
            className="space-right"
          >
            {
              isToggled
                ? (<i className="fa fa-chevron-down" />)
                : (<i className="fa fa-chevron-right" />)
            }
          </Button>
          <h4 onClick={this._handleToggle}>
            {eventName} {pairs.length ? <span className="bubble space-left">{pairs.length}</span> : null}
          </h4>
          {pairs.length ? (
            <PromptButton
              key={Math.random()}
              tabIndex={-1}
              confirmMessage="Click again to confirm"
              onClick={this._handleDeleteAllSetter}
              addIcon
              className="btn btn--clicky space-right"
              title="Delete all setter"
            >
              <i className="fa fa-eraser" />
            </PromptButton>
          ) : null}
          {(!maxPairs || pairs.length < maxPairs) ? (
            <Button
              onClick={this._handleCreateSetter}
              className="btn btn--clicky"
            >
              <i className="fa fa-plus-circle" />
            </Button>
          ) : null}
        </div>
        {isToggled && pairs.length > 0 && <Lazy delay={pairs.length > 20 ? 50 : -1}>
          <ul className={classes}>
            {pairs.map((pair, i) => (
              <VariableValueSetterRow
                noDelete={disableDelete}
                noToggle={disableToggle}
                key={pair.id || 'no-id'}
                index={i} // For dragging
                ref={this._setRowRef}
                keyWidth={keyWidth}
                sortable
                readOnlyKey={readOnlyKey}
                ignoreSuggestKey={ignoreSuggestKey}
                valuePlaceholder={valuePlaceholder}
                onChange={this._handlePairChange}
                onDelete={this._handlePairDelete}
                onFocusName={this._handleFocusName}
                onFocusValue={this._handleFocusValue}
                onKeyDown={this._handleKeyDown}
                onBlurName={this._handleBlurName}
                onBlurValue={this._handleBlurValue}
                onMove={this._handleMove}
                variables={variables}
                nunjucksPowerUserMode={nunjucksPowerUserMode}
                isVariableUncovered={isVariableUncovered}
                handleRender={handleRender}
                handleGetRenderContext={handleGetRenderContext}
                handleGetAutocompleteValueConstants={handleGetAutocompleteValueConstants}
                pair={pair}
              />
            ))}
          </ul>
        </Lazy>}
      </StyledContainer>
    );
  }
}
