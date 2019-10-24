import React from 'react';
import {
    Spinner,
    Tag, Icon,
    H4,H3,H2,
    Button, Card, Elevation, 
    Collapse, Classes,
    Tabs, Tab} from "@blueprintjs/core";
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
            isOpen:true,
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
    render() {
        var d = this.props.device;
        var serial = this.props.device.id;
        var v = d.version;

        var defaultTag = '';
        var firmwareTag = 'Unknown device.';
        var firmwareIntent = 'secondary';
        if (d.isSolo){
            defaultTag = 'primary';
            firmwareTag = 'Up to date.';
            firmwareIntent = 'success';
            var v2 = this.props.latestVersion;
            var vnum1 = (v[0] << 16) | (v[1] << 8) | (v[2] << 0);
            var vnum2 = ((v2[0] << 16) | (v2[1] << 8) | (v2[2] << 0)); 
            if (vnum2 == 0) {
                firmwareTag = 'Unable to check firmware.';
                firmwareIntent = 'secondary';
            } else if (vnum2 > vnum1) {
                firmwareTag = 'Out of date.'; 
                firmwareIntent = 'warning';
            }
        }

        return <div>
            <Card className="pb-1" interactive={true} elevation={Elevation.THREE} onClick={() => { this.onClick() }}>
                <h5><a href="#">{this.props.device.product}</a></h5>

                <div className="d-flex flex-row bd-highlight mb-0">
                    <div className="p-2 bd-highlight">
                        <Tag intent={defaultTag}>{this.props.device.manufacturer}</Tag>
                    </div>
                    <div className="p-2 bd-highlight ">
                        Serial: <span className="font-weight-bold"> {serial}</span>
                    </div>
                    {
                        this.props.device.isSolo && <div className="p-2 bd-highlight">Version: 
                           <span className="font-weight-bold"> {v[0]+'.'+v[1]+'.'+v[2]} </span>
                        </div>
                    }
                    <div className="p-2 bd-highlight"><Tag intent={firmwareIntent}>{firmwareTag}</Tag></div>
                </div>
                <div className="row bd-highlight mb-0 justify-content-center">
                    <Icon icon={this.state.isOpen ? "chevron-up" : "chevron-down"} iconSize={28}/>
                </div>
            </Card>
            <Collapse isOpen={this.state.isOpen} className="ml-4 mt-1">
                <Card interactive={false}>
                    <Tabs id="TabsExample" onChange={this.handleTabChange} selectedTabId={this.state.tab}>
                        <Tab id="ng" title="FIDO2" panel={<FIDO2Tab device={this.props.device}/> } />
                        <Tabs.Expander />
                    </Tabs>
                </Card>
            </Collapse>
        </div>
    }
}


export default class App extends React.Component {

    constructor() {
        super()
        this.state = {
            devices: [{ name: "solo" },],
            latestVersion: [0,0,0],
            loading: true,
            status: 'Checking latest firmware version online...',
            statusIntent: 'secondary',
        }
        this.listDevices = this.listDevices.bind(this);
    }

    async listDevices() {
        this.state.devices = []
        this.setState({ 
            devices: this.state.devices, 
            loading: true,
            statusIntent: 'secondary',
            status: 'Checking latest firmware version...',
        });

        try {
            var res = await fetch('https://api.github.com/repos/solokeys/solo/releases/latest');
            var json = await res.json();
            var tag = json.tag_name;
            tag = tag.split('.');
            tag = tag.map((i)=>(parseInt(i)));
            this.state.latestVersion = tag;
            this.setState({
                latestVersion: tag, 
                status: 'Latest firmware: ' + tag[0] + '.' + tag[1] + '.' + tag[2], 
                statusIntent: 'success',
            });
            console.log('Latest firmware: ', tag);
        } catch (e) {
            this.setState({
                latestVersion: [0,0,0], 
                status: 'Cannot check firmware: no internet.', 
                statusIntent: 'warning',
            });
            console.log('Error getting latest version', e);
        }

        var devices = await Comm.sendRecv('list');
        console.log('devices,', devices);

        for (var i = 0; i < devices.length; i++) {
            this.state.devices.push(devices[i]);
            this.setState({ devices: this.state.devices });
        }
        this.setState({ loading: false });
    }

    componentDidMount() {
        this.listDevices().then(() => {
        });
    }

    render() {
        return <Content>
            <div className="d-flex flex-row bd-highlight mb-2">
                <div className="p-2 bd-highlight">
                    <H2>Solo Desktop</H2>
                </div>
                <div className="p-2 bd-highlight mt-2">
                    <Tag intent={this.state.statusIntent} className=""><div className="">{this.state.status}</div></Tag>
                </div>
                <div className="p-2 bd-highlight ">
                    {
                        this.state.loading &&
                        <div className="p-2 bd-highlight float-right">
                            <Spinner className="" intent="primary" size={50} />
                        </div>
                    }
                </div>
            </div>
            <Button
                icon="refresh"
                onClick={this.listDevices}
            // {...buttonProps}
            >
                Refresh Authenticators
                    </Button>

            {this.state.devices.map((item, key) =>
                <DeviceItem device={item} key={key} latestVersion={this.state.latestVersion} />
            )}

        </Content>;
    }
}