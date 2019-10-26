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
import PINTab from './components/PIN'
import ResetTab from './components/Reset'
import UpdateTab from './components/Update'

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
            tab: "up",
            versions: [],
            extensions: [],
            hasButton: true,
            hasPin: false,
            hasRk: true,
            updateClicked: false,
        };
        this.handleTabChange = this.handleTabChange.bind(this);
        this.update= this.update.bind(this);
    }
    onClick(){
        // Ignore button presses
        if (this.state.updateClicked){
            this.state.updateClicked = false;
            return;
        }
        console.log('click');
        this.setState({isOpen: !this.state.isOpen});
    }
    update(){
        console.log('click update');
        this.state.updateClicked = true;
    }
    handleTabChange(t){
        console.log('tab change',t);
        this.setState({tab:t});
    }
    componentDidMount(){
        var info = this.props.device.info;
        if (info){
            var versions = info[1];
            var extensions = info[2];
            var hasButton = info[4].up;
            var hasPin = info[4].clientPin;
            var hasRk = info[4].rk;
            this.props.device.versions = versions;
            this.props.device.extensions = extensions;
            this.props.device.hasButton = hasButton;
            this.props.device.hasPin = hasPin;
            this.props.device.hasRk= hasRk;
            this.setState(
                {
                    versions: versions,
                    extensions: extensions,
                    hasButton: hasButton,
                    hasPin: hasPin,
                    hasRk: hasRk,
                }
            )
        }
    }
    render() {
        var d = this.props.device;
        var serial = this.props.device.id;
        var v = d.version;

        var defaultTag = '';
        var firmwareTag = 'Unknown device.';
        var firmwareIntent = 'secondary';
        var v2 = this.props.latestVersion;
        var needsUpdate = 0;
        if (d.isSolo){
            defaultTag = 'primary';
            firmwareTag = 'Up to date.';
            firmwareIntent = 'success';
            var vnum1 = (v[0] << 16) | (v[1] << 8) | (v[2] << 0);
            var vnum2 = ((v2[0] << 16) | (v2[1] << 8) | (v2[2] << 0))+1; 
            if (vnum2 == 0) {
                firmwareTag = 'Unable to check firmware.';
                firmwareIntent = 'warning';
            } else if (vnum2 > vnum1) {
                firmwareTag = 'Out of date.'; 
                firmwareIntent = 'warning';
                needsUpdate = 1;
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

                    <div className="p-2 bd-highlight">
                        {
                            needsUpdate ?
                            <Button icon="automatic-updates" intent="warning" 
                            text={"Out of date. Update to "+v2[0]+"."+v2[1]+"."+v2[2]+" now."} 
                            className="p-3" onClick={this.update}/>
                            :
                            <Tag intent={firmwareIntent}>{firmwareTag}</Tag>
                        }
                    </div>

                    <div className="pr-1 pl-1 pt-2 bd-highlight">
                        {this.state.versions.map((item, key) =>
                            <Tag className="mr-1" key={key} intent="success">{item}</Tag>
                        )}
                        {this.state.extensions.map((item, key) => 
                            <Tag className="mr-1" key={key} intent="primary">{item}</Tag>
                        )}


                    </div>
                        {/* <div className="p-2 bd-highlight"> */}
                            {/* </div> */}
                    {this.state.hasPin &&
                        <div className="p-2 bd-highlight"><Tag intent="secondary" icon="lock">Pin set</Tag></div>
                    }



                </div>
                <div className="row bd-highlight mb-0 justify-content-center">
                    <Icon icon={this.state.isOpen ? "chevron-up" : "chevron-down"} iconSize={28}/>
                </div>
            </Card>
            <Collapse isOpen={this.state.isOpen} className="ml-4 mt-1">
                <Card interactive={false}>
                    <Tabs id="TabsExample" onChange={this.handleTabChange} selectedTabId={this.state.tab}>
                        <Tab id="fi" title="FIDO2" panel={<FIDO2Tab device={this.props.device}/> } />
                        <Tab id="pi" title="Manage PIN" panel={<PINTab device={this.props.device}/> } />
                        <Tab id="re" title="Reset" panel={<ResetTab device={this.props.device}/> } />
                        <Tab id="up" title="Update" panel={<UpdateTab device={this.props.device} latestVersion={this.props.latestVersion}/> } />
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