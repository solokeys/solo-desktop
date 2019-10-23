import React from 'react';
import { AnchorButton, Button, Code, H5, Intent, Switch } from "@blueprintjs/core";
import Content from './components/Content'

export default class App extends React.Component {
    render() {
        return <Content>
                   <h2>Hello Electroz</h2>
                    <Button
                        icon="refresh"
                        // {...buttonProps}
                    >
                        Refresh Authenticators
                    </Button>

                </Content>;
    }
}