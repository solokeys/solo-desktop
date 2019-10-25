import React from 'react';

export default class App extends React.Component {
    render() {
        return <div className="p-3 bp3-dark">
                    {this.props.children}
                </div>;
    }
}