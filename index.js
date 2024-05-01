import { selectAll, matches } from 'unist-util-select'

function takeProps(nodes, selector, newNode) {
  let newNodeProps = { ...newNode.properties }
  if (selector) {
    for (let child of nodes) {
      if (matches(selector, child)) {
        newNodeProps = { ...newNodeProps, ...child.properties }
        child.properties = {}
        break
      }
    }
  }
  return newNodeProps
}

function wrap(tree, opts) {
  let {
    start,
    end,
    startNodes,
    startExcludedNodes,
    endNodes,
    endExcludedNodes,
    newNode,
    props,
    transform = (n) => n,
  } = opts
  let inside = false
  let current = []
  let newChildren = []
  for (let node of tree.children ?? []) {
    if (!inside && startNodes.includes(node) && !startExcludedNodes.includes(node)) {
      if (start.inclusive) {
        current.push(node)
      } else {
        newChildren.push(node)
      }
      inside = true
      startNodes.splice(startNodes.indexOf(node), 1)
    } else if (inside && endNodes.includes(node) && !endExcludedNodes.includes(node)) {
      if (end.inclusive) {
        current.push(node)
      }
      newChildren.push(
        transform({
          ...newNode,
          properties: takeProps(current, props, newNode),
          children: current,
        })
      )
      if (!end.inclusive && startNodes.includes(node) && !startExcludedNodes.includes(node)) {
        if (start.inclusive) {
          current = [node]
        } else {
          current = []
          newChildren.push(node)
        }
        startNodes.splice(startNodes.indexOf(node), 1)
      } else {
        if (!end.inclusive) {
          newChildren.push(wrap(node, opts))
        }
        current = []
        inside = false
      }
      endNodes.splice(endNodes.indexOf(node), 1)
    } else if (inside) {
      current.push(node)
    } else {
      newChildren.push(wrap(node, opts))
    }
  }
  if (current.length) {
    newChildren.push(
      transform({
        ...newNode,
        properties: takeProps(current, props, newNode),
        children: current,
      })
    )
  }
  tree.children = newChildren
  return tree
}

export function remarkRehypeWrap(...rules) {
  return (tree) => {
    for (let rule of rules) {
      if (!rule.end) {
        rule.end = rule.start
      }

      let start = typeof rule.start === 'string' ? { selector: rule.start } : { ...rule.start }
      start.inclusive = start.inclusive ?? true

      let end = typeof rule.end === 'string' ? { selector: rule.end } : { ...rule.end }
      end.inclusive = end.inclusive ?? false

      let startNodes = selectAll(start.selector, tree)
      let startExcludedNodes = start.exclude ? selectAll(start.exclude, tree) : []

      let endNodes = selectAll(end.selector, tree)
      let endExcludedNodes = end.exclude ? selectAll(end.exclude, tree) : []

      wrap(tree, {
        start,
        end,
        startNodes,
        startExcludedNodes,
        endNodes,
        endExcludedNodes,
        newNode: rule.node,
        props: rule.props,
        transform: rule.transform,
      })
    }
  }
}
