'use strict';

/**
 * Scope for XML namespaces
 * @param {NamespaceScope} [parent] Parent scope
 * @returns {NamespaceScope}
 * @constructor
 */
class NamespaceScope {
  constructor(parent) {
    this.parent = parent;
    this.namespaces = {};
    this.prefixCount = 0;
  }

  /**
   * Look up the namespace URI by prefix
   * @param {String} prefix Namespace prefix
   * @param {Boolean} [localOnly] Search current scope only
   * @returns {String} Namespace URI
   */
  getNamespaceURI(prefix, localOnly) {
    switch (prefix) {
      case 'xml':
        return 'http://www.w3.org/XML/1998/namespace';
      case 'xmlns':
        return 'http://www.w3.org/2000/xmlns/';
      default:
        var nsURI = this.namespaces[prefix];
        /*jshint -W116 */
        if (nsURI != null) {
          return nsURI.uri;
        } else if (!localOnly && this.parent) {
          return this.parent.getNamespaceURI(prefix);
        } else {
          return null;
        }
    }
  }

  getNamespaceMapping(prefix) {
    switch (prefix) {
      case 'xml':
        return {
          uri: 'http://www.w3.org/XML/1998/namespace',
          prefix: 'xml',
          declared: true
        };
      case 'xmlns':
        return {
          uri: 'http://www.w3.org/2000/xmlns/',
          prefix: 'xmlns',
          declared: true
        };
      default:
        var mapping = this.namespaces[prefix];
        /*jshint -W116 */
        if (mapping != null) {
          return mapping;
        } else if (this.parent) {
          return this.parent.getNamespaceMapping(prefix);
        } else {
          return null;
        }
    }
  }

  /**
   * Look up the namespace prefix by URI
   * @param {String} nsURI Namespace URI
   * @param {Boolean} [localOnly] Search current scope only
   * @returns {String} Namespace prefix
   */
  getPrefix(nsURI, localOnly) {
    switch (nsURI) {
      case 'http://www.w3.org/XML/1998/namespace':
        return 'xml';
      case 'http://www.w3.org/2000/xmlns/':
        return 'xmlns';
      default:
        for (var p in this.namespaces) {
          if (this.namespaces[p].uri === nsURI) {
            return p;
          }
        }
        if (!localOnly && this.parent) {
          return this.parent.getPrefix(nsURI);
        } else {
          return null;
        }
    }
  }

  /**
   * Look up the namespace prefix by URI
   * @param {String} nsURI Namespace URI
   * @param {Boolean} [localOnly] Search current scope only
   * @returns {String} Namespace prefix
   */
  getPrefixMapping(nsURI, localOnly) {
    switch (nsURI) {
      case 'http://www.w3.org/XML/1998/namespace':
        return 'xml';
      case 'http://www.w3.org/2000/xmlns/':
        return 'xmlns';
      default:
        for (var p in this.namespaces) {
          if (this.namespaces[p].uri === nsURI && this.namespaces[p].declared===true) {
            return this.namespaces[p];
          }
        }
        if (!localOnly && this.parent) {
          return this.parent.getPrefixMapping(nsURI);
        } else {
          return null;
        }
    }
  }

  /**
   * Generate a new prefix that is not mapped to any uris
   * @param base {string} The base for prefix
   * @returns {string}
   */
  generatePrefix(base) {
    base = base || 'ns';
    while (true) {
      let prefix = 'ns' + (++this.prefixCount);
      if (!this.getNamespaceURI(prefix)) {
        // The prefix is not used
        return prefix;
      }
    }
  }
}

/**
 * Namespace context that manages hierarchical scopes
 * @returns {NamespaceContext}
 * @constructor
 */
class NamespaceContext {
  constructor() {
    this.scopes = [];
    this.pushContext();
  }

  /**
   * Add a prefix/URI namespace mapping
   * @param {String} prefix Namespace prefix
   * @param {String} nsURI Namespace URI
   * @param {Boolean} [localOnly] Search current scope only
   * @returns {boolean} true if the mapping is added or false if the mapping
   * already exists
   */
  addNamespace(prefix, nsURI, localOnly) {
    if (this.getNamespaceURI(prefix, localOnly) === nsURI) {
      return false;
    }
    if (this.currentScope) {
      this.currentScope.namespaces[prefix] = {
        uri: nsURI,
        prefix: prefix,
        declared: false
      };
      return true;
    }
    return false;
  }

  /**
   * Push a scope into the context
   * @returns {NamespaceScope} The current scope
   */
  pushContext() {
    var scope = new NamespaceScope(this.currentScope);
    this.scopes.push(scope);
    this.currentScope = scope;
    return scope;
  }

  /**
   * Pop a scope out of the context
   * @returns {NamespaceScope} The removed scope
   */
  popContext() {
    var scope = this.scopes.pop();
    if (scope) {
      this.currentScope = scope.parent;
    } else {
      this.currentScope = null;
    }
    return scope;
  }

  /**
   * Look up the namespace URI by prefix
   * @param {String} prefix Namespace prefix
   * @param {Boolean} [localOnly] Search current scope only
   * @returns {String} Namespace URI
   */
  getNamespaceURI(prefix, localOnly) {
    return this.currentScope &&
      this.currentScope.getNamespaceURI(prefix, localOnly);
  }

  /**
   * Look up the namespace prefix by URI
   * @param {String} nsURI Namespace URI
   * @param {Boolean} [localOnly] Search current scope only
   * @returns {String} Namespace prefix
   */
  getPrefix(nsURI, localOnly) {
    return this.currentScope &&
      this.currentScope.getPrefix(nsURI, localOnly);
  }

  /**
   * Look up the namespace mapping by nsURI
   * @param {String} nsURI Namespace URI
   * @returns {String} Namespace mapping
   */
  getPrefixMapping(nsURI) {
    return this.currentScope &&
      this.currentScope.getPrefixMapping(nsURI);
  }

  /**
   * Generate a new prefix that is not mapped to any uris
   * @param base {string} The base for prefix
   * @returns {string}
   */
  generatePrefix(base) {
    return this.currentScope &&
      this.currentScope.generatePrefix(base);
  }

  /**
   * Register a namespace
   * @param {String} prefix Namespace prefix
   * @param {String} nsURI Namespace URI
   * @returns {Object} The matching or generated namespace mapping
   */
  registerNamespace(prefix, nsURI) {
    var mapping;
    if (!prefix) {
      prefix = this.generatePrefix();
    } else {
      mapping = this.currentScope.getNamespaceMapping(prefix);
      if (mapping && mapping.uri === nsURI) {
        // Found an existing mapping
        return mapping;
      }
    }
    if (this.getNamespaceURI(prefix)) {
      // The prefix is already mapped to a different namespace
      prefix = this.generatePrefix();
    }
    if (this.currentScope) {
      mapping = {
        uri: nsURI,
        prefix: prefix,
        declared: false
      };
      this.currentScope.namespaces[prefix] = mapping;
      return mapping;
    }
    return null;
  }

  /**
   * Declare a namespace prefix/uri mapping
   * @param {String} prefix Namespace prefix
   * @param {String} nsURI Namespace URI
   * @returns {Boolean} true if the declaration is created
   */
  declareNamespace(prefix, nsURI) {
    // Find mapping registered for current scope or any ancestor
    var registeredMapping = this.registerNamespace(prefix, nsURI);
    if (!registeredMapping) {
      return null;
    }
    if (registeredMapping.declared) {
      return null;
    }
    // Fetch registered mapping from current scope
    var mapping = this.currentScope.namespaces[registeredMapping.prefix];
    if (mapping) {
      // Mapping has been newly created on current scope by registerNamespace, mark it as declared.
      // Children will refer to it from nested contexts but will not re-declare it themselves.
      mapping.declared = true;
    } else {
      // Mapping has been found on ancestor by registerNamespace and is not declared (i.e. read from WSDL).
      // Do not change the original! This would cause elements that are not children of current context to
      // ignore the mapping and generate invalid XML (without necessary xmlns declarations).
      // Create a copy in current scope and mark the copy as declared. Children will refer to it from nested
      // contexts but will not re-declare it. After current context is popped, subsequent elements will only
      // see the undeclared original.
      mapping = {
        prefix: registeredMapping.prefix,
        uri: nsURI,
        declared: true
      };
      this.currentScope.namespaces[registeredMapping.prefix] = mapping;
    }
    return mapping;
  };
}

module.exports = NamespaceContext;
