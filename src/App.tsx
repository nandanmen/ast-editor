import React from "react";
import { parse } from "@babel/parser";
import * as Babel from "@babel/standalone";
import {
  Box,
  Flex,
  Stack,
  Button,
  Select,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
} from "@chakra-ui/react";

const inputCode = `var a = 10;

function sum(a, b) {
  var result = a + b;
  return result;
}`;

const tree = parse(inputCode);

const TreeContext = React.createContext();

const compile = () => Babel.transformFromAst(tree.program, "", {});

export default function App() {
  const [out, setOut] = React.useState(compile);

  const recompile = React.useCallback(() => {
    setOut(compile());
  }, []);

  return (
    <TreeContext.Provider value={{ recompile }}>
      <Flex gap="16" p="4">
        <Tree tree={tree.program} />
        <pre>{out.code}</pre>
      </Flex>
    </TreeContext.Provider>
  );
}

// --

const operators = [
  "+",
  "-",
  "/",
  "%",
  "*",
  "**",
  "&",
  ",",
  ">>",
  ">>>",
  "<<",
  "^",
  "==",
  "===",
  "!=",
  "!==",
  "in",
  "instanceof",
  ">",
  "<",
  ">=",
  "<=",
];

const formComponents = {
  "VariableDeclaration.kind": ({ value, node }) => {
    const { recompile } = React.useContext(TreeContext);
    return (
      <Select
        defaultValue={value}
        width="fit-content"
        size="sm"
        onChange={(evt) => {
          node.kind = evt.target.value;
          recompile();
        }}
      >
        <option value="var">var</option>
        <option value="let">let</option>
        <option value="const">const</option>
      </Select>
    );
  },
  "BinaryExpression.operator": ({ value, node }) => {
    const { recompile } = React.useContext(TreeContext);
    return (
      <Select
        defaultValue={value}
        width="fit-content"
        size="sm"
        onChange={(evt) => {
          node.operator = evt.target.value;
          recompile();
        }}
      >
        {operators.map((operation) => (
          <option value={operation}>{operation}</option>
        ))}
      </Select>
    );
  },
  "Identifier.name": ({ value, node }) => {
    const { recompile } = React.useContext(TreeContext);
    return (
      <Input
        defaultValue={value}
        width="fit-content"
        size="sm"
        onChange={(evt) => {
          node.name = evt.target.value;
          recompile();
        }}
      />
    );
  },
  "NumericLiteral.value": ({ value, node }) => {
    const { recompile } = React.useContext(TreeContext);
    return (
      <NumberInput
        defaultValue={value}
        width="fit-content"
        size="sm"
        onChange={(evt) => {
          node.value = Number(evt);
          recompile();
        }}
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    );
  },
  "FunctionDeclaration.generator": ({ value, node }) => {
    const { recompile } = React.useContext(TreeContext);
    return (
      <Switch
        defaultValue={value}
        onChange={(evt) => {
          node.generator = evt.target.checked;
          recompile();
        }}
      />
    );
  },
  "FunctionDeclaration.async": ({ value, node }) => {
    const { recompile } = React.useContext(TreeContext);
    return (
      <Switch
        defaultValue={value}
        onChange={(evt) => {
          node.async = evt.target.checked;
          recompile();
        }}
      />
    );
  },
};

function Tree({ tree }) {
  const [isOpen, setOpen] = React.useState(false);
  const childKeys = getChildren(tree);
  const hasChildren = childKeys.length > 0;

  return (
    <Box fontFamily="mono" lineHeight="1">
      <Button
        onClick={() => setOpen((open) => !open)}
        disabled={!hasChildren}
        size="sm"
      >
        {getName(tree)} {hasChildren && (isOpen ? "-" : "+")}
      </Button>
      {isOpen && (
        <Stack pl="6" mt="2">
          {childKeys.map(({ key, children, value, isPrimitive }) => {
            if (isPrimitive) {
              const Component = formComponents[`${getName(tree)}.${key}`];
              return (
                <Flex gap="2" alignItems="center">
                  <Box as="p" bg="gray.100" p="1" borderRadius="sm">
                    {key}
                  </Box>
                  {Component ? (
                    <Component value={value} node={tree} />
                  ) : (
                    <p>{String(value)}</p>
                  )}
                </Flex>
              );
            }
            return (
              <div>
                <Box
                  as="p"
                  bg="gray.100"
                  p="1"
                  borderRadius="sm"
                  width="fit-content"
                >
                  {key}
                </Box>
                <Stack pl="6" mt="2">
                  {children.map((child) => (
                    <div>
                      <Tree tree={child} />
                    </div>
                  ))}
                </Stack>
              </div>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

const ALLOW_LIST = new Set([
  "kind",
  "name",
  "generator",
  "async",
  "value",
  "operator",
]);

function getName(tree) {
  return tree.type;
}

function getChildren(tree) {
  const children = [];
  for (const [key, value] of Object.entries(tree)) {
    if (ALLOW_LIST.has(key)) {
      children.push({ key, value, isPrimitive: true });
    } else if (isAstNode(value)) {
      children.push({ key, children: [value] });
    } else if (Array.isArray(value)) {
      const [first] = value;
      if (isAstNode(first)) {
        /* assumes that if the first node is an AST node, all items in the array are AST nodes as well */
        children.push({ key, children: value });
      }
    }
  }
  return children;
}

function isAstNode(node) {
  return node && node.hasOwnProperty("type");
}
