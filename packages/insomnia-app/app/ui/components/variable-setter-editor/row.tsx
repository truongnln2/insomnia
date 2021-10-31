// eslint-disable-next-line filenames/match-exported
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import classnames from 'classnames';
import React, { PureComponent } from 'react';
import {
  ConnectDragPreview,
  ConnectDragSource,
  ConnectDropTarget,
  DragSource, DropTarget,
} from 'react-dnd';
import ReactDOM from 'react-dom';

import { AUTOBIND_CFG } from '../../../common/constants';
import { describeByteSize } from '../../../common/misc';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { Key } from '../../../templating/utils';
import { Button } from '../base/button';
import { Dropdown } from '../base/dropdown/dropdown';
import { DropdownButton } from '../base/dropdown/dropdown-button';
import { DropdownItem } from '../base/dropdown/dropdown-item';
import { PromptButton } from '../base/prompt-button';
import { OneLineEditor } from '../codemirror/one-line-editor';
import { showModal } from '../modals';
import { CodePromptModal } from '../modals/code-prompt-modal';

export interface VariableSetterPair {
  id: string;
  propertyName: string;
  value: string;
  description: string;
  disabled: boolean;
  multiline: boolean;
}

interface Props {
  onChange: (patch: Partial<VariableSetterPair>) => void;
  onDelete: Function;
  onFocusName: Function;
  onFocusValue: Function;
  index: number;
  pair: VariableSetterPair;
  readOnly?: boolean;
  readOnlyKey?: boolean;
  ignoreSuggestKey?: boolean;
  onMove?: Function;
  onKeyDown?: Function;
  onBlurName?: Function;
  onBlurValue?: Function;
  handleRender: HandleRender;
  handleGetRenderContext: HandleGetRenderContext;
  nunjucksPowerUserMode?: boolean;
  isVariableUncovered?: boolean;
  handleGetAutocompleteValueConstants?: Function;
  valuePlaceholder?: string;
  sortable?: boolean;
  noDelete?: boolean;
  noToggle?: boolean;
  noDropZone?: boolean;
  hideButtons?: boolean;
  className?: string;
  renderLeftIcon?: Function;
  keyWidth?: React.CSSProperties;
  // For drag-n-dro;
  connectDragSource?: ConnectDragSource;
  connectDragPreview?: ConnectDragPreview;
  connectDropTarget?: ConnectDropTarget;
  isDragging?: boolean;
  isDraggingOver?: boolean;
  variables: any[];
}

interface State {
  dragDirection: number;
  preview: string;
  error: string;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class KeyValueEditorBaseRow extends PureComponent<Props, State> {
  _valueInput: OneLineEditor | null = null;
  _variableSelect: HTMLSelectElement | null = null;
  state: State = {
    dragDirection: 0,
    preview: '',
    error: '',
  };

  componentDidMount() {
    this._update(this.props.pair.value, true);
  }

  focusNameEnd() {
    if (this._variableSelect) {
      this._variableSelect.focus();
    }
  }

  focusValueEnd() {
    if (this._valueInput) {
      this._valueInput?.focusEnd();
    }
  }

  setDragDirection(dragDirection) {
    if (dragDirection !== this.state.dragDirection) {
      this.setState({
        dragDirection,
      });
    }
  }

  _setSelectRef(n: HTMLSelectElement) {
    this._variableSelect = n;
    // Let it render, then focus the input
    setTimeout(() => {
      this._variableSelect?.focus();
    }, 100);
  }

  _sendChange(patch: Partial<VariableSetterPair>) {
    const pair = Object.assign({}, this.props.pair, patch);
    this.props.onChange && this.props.onChange(pair);
  }

  _handleChangeVariable(e) {
    const selected = e.target.value;
    const { variables } = this.props;
    if (selected) {
      this._update(variables[selected]);
    } else {
      this._update(null);
    }
  }

  async _update(value: string | Key | null, noCallback = false) {
    const { handleRender, variables } = this.props;
    let preview = '';
    let error = '';
    let stringValue = '';
    let keyValue: Key | null | undefined = null;

    if (value) {
      if (typeof value === 'object') {
        keyValue = value as Key;
        stringValue = keyValue.name;
      } else {
        stringValue = value as string;
        keyValue = variables.find(v => v.name === stringValue);
      }

      try {
        preview = await handleRender(`{{ ${stringValue} }}`);
      } catch (err) {
        error = err.message;
      }
    }
    // Hack to skip updating if we unmounted for some reason
    if (this._variableSelect) {
      this.setState({
        preview,
        error,
      });
    }

    // Call the callback if we need to
    if (!noCallback) {
      this._sendChange({
        propertyName: stringValue,
      });
    }
  }

  _handleValueChange(value) {
    this._sendChange({
      value,
    });
  }

  _handleDisableChange(disabled) {
    this._sendChange({
      disabled,
    });
  }

  _handleFocusVariable(e) {
    this.props.onFocusName(this.props.pair, e);
  }

  _handleFocusValue(e) {
    this.props.onFocusValue(this.props.pair, e);
  }

  _handleBlurVariable(e) {
    if (this.props.onBlurName) {
      this.props.onBlurName(this.props.pair, e);
    }
  }

  _handleBlurValue(e) {
    if (this.props.onBlurName) {
      this.props.onBlurValue?.(this.props.pair, e);
    }
  }

  _handleDelete() {
    if (this.props.onDelete) {
      this.props.onDelete(this.props.pair);
    }
  }

  _handleKeyDown(e, value) {
    if (this.props.onKeyDown) {
      this.props.onKeyDown(this.props.pair, e, value);
    }
  }

  _handleAutocompleteValues() {
    const { handleGetAutocompleteValueConstants } = this.props;

    if (handleGetAutocompleteValueConstants) {
      return handleGetAutocompleteValueConstants(this.props.pair);
    }
    return [];
  }

  _handleTypeChange(def) {
    this._sendChange({
      multiline: def.multiline,
    });
  }

  _handleEditMultiline() {
    const { pair, handleRender, handleGetRenderContext } = this.props;
    showModal(CodePromptModal, {
      submitName: 'Done',
      title: `Edit setter value for "${pair.propertyName}"`,
      defaultValue: pair.value,
      enableEditFontSize: true,
      hideLineNumbers: false,
      onChange: this._handleValueChange,
      enableRender: handleRender || handleGetRenderContext,
      mode: pair.multiline || 'text/plain',
      onModeChange: mode => {
        this._handleTypeChange(
          Object.assign({}, pair, {
            multiline: mode,
          }),
        );
      },
    });
  }

  renderPairValue() {
    const {
      pair,
      readOnly,
      valuePlaceholder,
      handleRender,
      handleGetRenderContext,
      nunjucksPowerUserMode,
      isVariableUncovered,
    } = this.props;
    if (pair.multiline) {
      const bytes = Buffer.from(pair.value, 'utf8').length;
      return (
        <button
          className="btn btn--outlined btn--super-duper-compact wide ellipsis"
          onClick={this._handleEditMultiline}
        >
          <i className="fa fa-pencil-square-o space-right" />
          {bytes > 0 ? describeByteSize(bytes, true) : 'Click to Edit'}
        </button>
      );
    } else {
      return (
        <OneLineEditor
          ref={ref => { this._valueInput = ref; }}
          readOnly={readOnly}
          type={'text'}
          placeholder={valuePlaceholder || 'Value'}
          defaultValue={pair.value}
          onChange={this._handleValueChange}
          onBlur={this._handleBlurValue}
          onKeyDown={this._handleKeyDown}
          onFocus={this._handleFocusValue}
          render={handleRender}
          getRenderContext={handleGetRenderContext}
          nunjucksPowerUserMode={nunjucksPowerUserMode}
          isVariableUncovered={isVariableUncovered}
          getAutocompleteConstants={this._handleAutocompleteValues}
        />
      );
    }
  }

  render() {
    const {
      pair,
      sortable,
      noDropZone,
      hideButtons,
      readOnly,
      className,
      isDragging,
      isDraggingOver,
      noDelete,
      noToggle,
      renderLeftIcon,
      connectDragSource,
      connectDragPreview,
      connectDropTarget,
      keyWidth,
      variables,
    } = this.props;
    const {
      dragDirection,
    } = this.state;
    const classes = classnames(className, {
      'key-value-editor__row-wrapper': true,
      'key-value-editor__row-wrapper--dragging': isDragging,
      'key-value-editor__row-wrapper--dragging-above': isDraggingOver && dragDirection > 0,
      'key-value-editor__row-wrapper--dragging-below': isDraggingOver && dragDirection < 0,
      'key-value-editor__row-wrapper--disabled': pair.disabled,
    });

    let handle: ConnectDragSource | JSX.Element | undefined | null = null;

    if (sortable) {
      handle = renderLeftIcon ? (
        <div className="key-value-editor__drag">{renderLeftIcon()}</div>
      ) : (
        connectDragSource?.(
          <div className="key-value-editor__drag">
            <i className={'fa ' + (hideButtons ? 'fa-empty' : 'fa-bars')} />
          </div>,
        )
      );
    }
    const keyContainerStyle: React.CSSProperties = {};
    if (keyWidth) {
      Object.assign(keyContainerStyle, keyWidth);
    }
    const selectedId = variables.findIndex(v => v.name === pair.propertyName);
    const row = (
      <li className={classes}>
        {handle}
        <div className="key-value-editor__row">
          <div
            className={classnames('form-control form-control--underlined form-control--wide', {
              'form-control--inactive': pair.disabled,
            })}
            style={keyContainerStyle}
          >
            <select
              ref={this._setSelectRef}
              value={selectedId === -1 ? '' : selectedId}
              disabled={readOnly}
              onBlur={this._handleBlurVariable}
              onFocus={this._handleFocusVariable}
              onChange={this._handleChangeVariable}
            >
              <option value={''}>-- Please select a variable --</option>
              {variables.map((v, i) => (
                <option key={`${i}::${v.name}`} value={i}>
                  [{v.meta?.type?.substr(0, 3)}]({v.meta?.name}) {v.name}
                </option>
              ))}
            </select>
          </div>
          <div
            className={classnames('form-control form-control--underlined form-control--wide', {
              'form-control--inactive': pair.disabled,
            })}
          >
            {this.renderPairValue()}
          </div>

          <Dropdown right>
            <DropdownButton className="tall">
              <i className="fa fa-caret-down" />
            </DropdownButton>
            <DropdownItem
              onClick={this._handleTypeChange}
              value={{
                type: 'text',
                multiline: false,
              }}
            >
              Text
            </DropdownItem>
            <DropdownItem
              onClick={this._handleTypeChange}
              value={{
                type: 'text',
                multiline: true,
              }}
            >
              Text (Multi-line)
            </DropdownItem>
          </Dropdown>

          {!noToggle && (!hideButtons ? (
            <Button
              onClick={this._handleDisableChange}
              value={!pair.disabled}
              title={pair.disabled ? 'Enable item' : 'Disable item'}
            >
              {pair.disabled ? (
                <i className="fa fa-square-o" />
              ) : (
                <i className="fa fa-check-square-o" />
              )}
            </Button>
          ) : (
            <button>
              <i className="fa fa-empty" />
            </button>
          ))}

          {!noDelete &&
            (!hideButtons ? (
              <PromptButton
                key={Math.random()}
                tabIndex={-1}
                confirmMessage=""
                addIcon
                onClick={this._handleDelete}
                title="Delete item"
              >
                <i className="fa fa-trash-o" />
              </PromptButton>
            ) : (
              <button>
                <i className="fa fa-empty" />
              </button>
            ))}
        </div>
      </li>
    );

    if (noDropZone) {
      return row;
    } else {
      const dropTarget = connectDropTarget?.(row);
      // @ts-expect-error -- TSCONVERSION investigate whether a cast is actually appropriate here
      return connectDragPreview?.(dropTarget);
    }
  }
}

const dragSource = {
  beginDrag(props: Props) {
    return {
      pair: props.pair,
    };
  },
};

function isAbove(monitor, component) {
  const hoveredNode = ReactDOM.findDOMNode(component);
  // @ts-expect-error -- TSCONVERSION
  const hoveredTop = hoveredNode.getBoundingClientRect().top;
  // @ts-expect-error -- TSCONVERSION
  const height = hoveredNode.clientHeight;
  const draggedTop = monitor.getSourceClientOffset().y;
  // NOTE: Not quite sure why it's height / 3 (seems to work)
  return hoveredTop > draggedTop - height / 3;
}

const dragTarget = {
  drop(props, monitor, component) {
    if (isAbove(monitor, component)) {
      props.onMove(monitor.getItem().pair, props.pair, 1);
    } else {
      props.onMove(monitor.getItem().pair, props.pair, -1);
    }
  },

  hover(_props, monitor, component) {
    if (isAbove(monitor, component)) {
      component.setDragDirection(1);
    } else {
      component.setDragDirection(-1);
    }
  },
};

const source = DragSource('KEY_VALUE_EDITOR', dragSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
}))(KeyValueEditorBaseRow);

const target = DropTarget('KEY_VALUE_EDITOR', dragTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isDraggingOver: monitor.isOver(),
}))(source);

target.prototype.focusNameEnd = function() {
  this.decoratedRef.current.decoratedRef.current.focusNameEnd();
};

target.prototype.focusValueEnd = function() {
  this.decoratedRef.current.decoratedRef.current.focusValueEnd();
};

export const VariableValueSetterRow = target;
