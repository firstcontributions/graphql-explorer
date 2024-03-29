import React, {Component} from 'react';
import GraphiQL from 'graphiql';
import GraphiQLExplorer from "graphiql-explorer";
import fetch from 'isomorphic-fetch';
import './App.css'
import { buildClientSchema, getIntrospectionQuery, parse } from "graphql";
import "graphiql/graphiql.css";



var DEFAULT_QUERY = `
{
  viewer {
    name
    handle
  }
}
`
class App extends Component {
  state = { schema: null, query: DEFAULT_QUERY, explorerIsOpen: true,  authenticated: false };


  componentDidMount() {
    
    this.setSchema()
    
    fetch('https://api.opensource.forum/v1/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: DEFAULT_QUERY,
      }),
    }).then((res)=> {
      res.json().then(data=>{
        if (data.data.viewer) {
          this.setState({authenticated: true})
        }
      })
    })
  }
  setSchema() {
    this.graphQLFetcher({
      query: getIntrospectionQuery()
    }).then(result => {
      

      this.setState({ schema: buildClientSchema(result.data) });
      window._state = { schema: buildClientSchema(result.data) };
    });
  }

  _handleInspectOperation = (
    cm,
    mousePos
  ) => {
    const parsedQuery = parse(this.state.query || "");

    if (!parsedQuery) {
      console.error("Couldn't parse query document");
      return null;
    }

    var token = cm.getTokenAt(mousePos);
    var start = { line: mousePos.line, ch: token.start };
    var end = { line: mousePos.line, ch: token.end };
    var relevantMousePos = {
      start: cm.indexFromPos(start),
      end: cm.indexFromPos(end)
    };

    var position = relevantMousePos;

    var def = parsedQuery.definitions.find(definition => {
      if (!definition.loc) {
        console.log("Missing location information for definition");
        return false;
      }

      const { start, end } = definition.loc;
      return start <= position.start && end >= position.end;
    });

    if (!def) {
      console.error(
        "Unable to find definition corresponding to mouse position"
      );
      return null;
    }

    var operationKind =
      def.kind === "OperationDefinition"
        ? def.operation
        : def.kind === "FragmentDefinition"
        ? "fragment"
        : "unknown";

    var operationName =
      def.kind === "OperationDefinition" && !!def.name
        ? def.name.value
        : def.kind === "FragmentDefinition" && !!def.name
        ? def.name.value
        : "unknown";

    var selector = `.graphiql-explorer-root #${operationKind}-${operationName}`;

    var el = document.querySelector(selector);
    el && el.scrollIntoView();
  };

  _handleEditQuery = (query) => this.setState({ query });

  _handleToggleExplorer = () => {
    this.setState({ explorerIsOpen: !this.state.explorerIsOpen });
  };

  graphQLFetcher(graphQLParams) {
    return fetch("https://api.opensource.forum/v1/graphql", {
      credentials: 'include',
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphQLParams),
    }).then(response => response.json());
  }

  render() {
    const { authenticated, query, schema } = this.state;
    return (
      <div className='top'>
        {
          !authenticated ? 
          <div className='header'>
            <a href={encodeURI("https://api.opensource.forum/v1/auth/redirect?origin=https://explorer.opensource.forum")}>
            <button className='button'>Login With Github</button>
            </a>
          </div>: null
        }
        <div className="graphiql-container">
          
          <GraphiQLExplorer
            schema={schema}
            query={query}
            onEdit={this._handleEditQuery}
            onRunOperation={operationName =>
              this._graphiql.handleRunQuery(operationName)
            }
            explorerIsOpen={this.state.explorerIsOpen}
            onToggleExplorer={this._handleToggleExplorer}
          />
          <GraphiQL
            ref={ref => (this._graphiql = ref)}
            fetcher={this.graphQLFetcher}
            schema={schema}
            query={query}
            onEditQuery={this._handleEditQuery}
          >
            <GraphiQL.Toolbar>
              <GraphiQL.Button
                onClick={() => this._graphiql.handlePrettifyQuery()}
                label="Prettify"
                title="Prettify Query (Shift-Ctrl-P)"
              />
              <GraphiQL.Button
                onClick={() => this._graphiql.handleToggleHistory()}
                label="History"
                title="Show History"
              />
              <GraphiQL.Button
                onClick={this._handleToggleExplorer}
                label="Explorer"
                title="Toggle Explorer"
              />
            </GraphiQL.Toolbar>
          </GraphiQL>
        </div>
      </div>
    );
  }
}

export default App;
