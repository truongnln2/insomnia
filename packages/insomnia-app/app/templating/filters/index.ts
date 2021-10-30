
import { PluginTemplateFilter } from '../extensions';
import jmespath from './jmespath';
import jsonDiff from './json-diff';
import jsonParse from './json-parse';
import jsonPath from './json-path';
import xml2json from './xml2json';

const filters: PluginTemplateFilter[] = [
  jmespath,
  jsonParse,
  jsonDiff,
  jsonPath,
  xml2json,
];

export default filters;
