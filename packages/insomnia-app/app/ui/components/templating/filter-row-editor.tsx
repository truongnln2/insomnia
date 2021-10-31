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
import { Workspace } from '../../../models/workspace';
import { ArgumentValue } from '../../../templating/parser';
import { NunjucksParsedFilter } from '../../../templating/utils';
import { Button } from '../base/button';
import { PromptButton } from '../base/prompt-button';
import { OneLineEditor } from '../codemirror/one-line-editor';
import { HelpTooltip } from '../help-tooltip';
import { PluginFilterArgumentsEditor } from './plugin-filter-args-editor';

export interface AppliedNunjucksParsedFilter extends NunjucksParsedFilter {
  id: string;
  argsValues: ArgumentValue[];
  metaSort: number;
}

interface Props {
  onChange: Function;
  onDelete: Function;
  index: number;
  filter: AppliedNunjucksParsedFilter;
  onMove?: Function;
  noDropZone?: boolean;
  className?: string;
  renderLeftIcon?: Function;
  // For drag-n-drop
  connectDragSource?: ConnectDragSource;
  connectDragPreview?: ConnectDragPreview;
  connectDropTarget?: ConnectDropTarget;
  isDragging?: boolean;
  isDraggingOver?: boolean;
  variables: any[];
  workspace: Workspace;
  filterTests: string[];
}

interface State {
  dragDirection: number;
  isToggled: boolean;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class KeyValueEditorBaseRow extends PureComponent<Props, State> {
  _valueInput: OneLineEditor | null = null;
  _variableSelect: HTMLSelectElement | null = null;
  state: State = {
    dragDirection: 0,
    isToggled: false,
  };

  setDragDirection(dragDirection) {
    if (dragDirection !== this.state.dragDirection) {
      this.setState({
        dragDirection,
      });
    }
  }

  _handleDelete(e) {
    e.preventDefault();
    if (this.props.onDelete) {
      this.props.onDelete(this.props.filter);
    }
  }

  _handleUpdateFilterArguments(values: ArgumentValue[]) {
    if (this.props.onChange) {
      this.props.onChange(this.props.index, values);
    }
  }

  _handleToggle(e) {
    e.preventDefault();
    const { filter } = this.props;
    if (filter.args?.length) {
      this.setState({
        isToggled: !this.state.isToggled,
      });
    }
  }

  render() {
    const {
      filter,
      noDropZone,
      workspace,
      className,
      filterTests,
      isDragging,
      isDraggingOver,
      renderLeftIcon,
      connectDragSource,
      connectDragPreview,
      connectDropTarget,
      variables,
    } = this.props;
    const {
      dragDirection,
      isToggled,
    } = this.state;
    const classes = classnames(className, {
      'filter-editor__row-wrapper': true,
      'filter-editor__row-wrapper--dragging': isDragging,
      'filter-editor__row-wrapper--dragging-above': isDraggingOver && dragDirection > 0,
      'filter-editor__row-wrapper--dragging-below': isDraggingOver && dragDirection < 0,
    });

    let handle: ConnectDragSource | JSX.Element | undefined | null = null;

    handle = renderLeftIcon ? (
      <div className="filter-editor__drag">{renderLeftIcon()}</div>
    ) : (
      connectDragSource?.(
        <div className="filter-editor__drag">
          <i className={'fa fa-bars'} />
        </div>,
      )
    );
    const row = (
      <li className={classes}>
        {handle}
        <div className="filter-header">
          {((filter.args?.length || 0) > 0)
            ? (<Button onClick={this._handleToggle} className="space-right">{
              isToggled
                ? (<i className="fa fa-chevron-down" />)
                : (<i className="fa fa-chevron-right" />)
            }</Button>)
            : (
              <button>
                <i className="fa fa-empty" />
              </button>)}

          <h4 onClick={this._handleToggle}>{filter.displayName || filter.name} <HelpTooltip info>{filter.description || filter.name}</HelpTooltip></h4>
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
        </div>
        {isToggled && (<div className="filter-arguments">
          <PluginFilterArgumentsEditor
            filter={filter}
            workspace={workspace}
            variables={variables}
            filterTests={filterTests}
            onUpdate={this._handleUpdateFilterArguments}
          />
        </div>)}
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
      filter: props.filter,
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
      props.onMove(monitor.getItem().filter, props.filter, 1);
    } else {
      props.onMove(monitor.getItem().filter, props.filter, -1);
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

export const FilterRowEditor = target;
