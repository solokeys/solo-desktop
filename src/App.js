import React from 'react';
import { H3, Button, Card, Elevation, Collapse, Classes, Tabs, Tab} from "@blueprintjs/core";
import Content from './components/Content'
import FIDO2Tab from './components/FIDO2'

const ReactPanel = ()=>(
    <div>
        <H3>Example panel: React</H3>
        <p className={Classes.RUNNING_TEXT}>
            Lots of people use React as the V in MVC. Since React makes no assumptions about the rest of your technology
            stack, it's easy to try it out on a small feature in an existing project.
        </p>
    </div>
);

class DeviceItem extends React.Component {
    constructor(){
        super()
        this.state = {
            isOpen:false,
            tab: "ng"
        };
        this.handleTabChange = this.handleTabChange.bind(this);
    }
    onClick(){
        this.setState({isOpen: !this.state.isOpen});
    }
    handleTabChange(t){
        console.log('tab change',t);
        this.setState({tab:t});
    }
    render(){
        return <div>
            <Card interactive={true} elevation={Elevation.THREE} onClick={()=>{this.onClick()}}>
                <h5><a href="#">{this.props.item}</a></h5>
                <p>Card content</p>
            </Card>
                <Collapse isOpen={this.state.isOpen} className="ml-4 mt-1">
                    <Card interactive={false}>
                    <Tabs id="TabsExample" onChange={this.handleTabChange} selectedTabId={this.state.tab}>
                        <Tab id="ng" title="FIDO2" panel={<FIDO2Tab/>} />
                        <Tabs.Expander />
                    </Tabs>
                    </Card>
                </Collapse>
        </div>
    }
}

var fakeDevices = [{name:"solo"},];

export default class App extends React.Component {

    constructor(){
        super()
        this.state = {
            devices: [{name:"solo"},],
            loading: true,
        }
        this.listDevices = this.listDevices.bind(this);
    }

    async listDevices(){
        this.state.devices = []
        this.setState({ devices: this.state.devices, loading: true });
        setTimeout(()=>{

            for(var i = 0; i<fakeDevices.length; i++){
                this.state.devices.push(fakeDevices[i]);
                this.setState({ devices: this.state.devices });
            }
        },250);
    }

    componentDidMount(){
        this.listDevices().then(() => {
            this.setState({loading: false});
        });
    }

    render() {
        return <Content>
            <h2>Solo Desktop</h2>
            <Button
                icon="refresh"
                onClick={this.listDevices}
            // {...buttonProps}
            >
                Refresh Authenticators
                    </Button>

            {this.state.devices.map((item, key) =>
                <DeviceItem item={item.name} key={key} />
            )}

        </Content>;
    }
}