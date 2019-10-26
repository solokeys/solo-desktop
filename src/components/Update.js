import React from 'react';
import { H1,H2,H3,H4,H5,
    Spinner, Classes, Button, Card, Tag, Overlay, Icon,
        Elevation, InputGroup, FormGroup} from "@blueprintjs/core";
import { timingSafeEqual } from 'crypto';
import GetPin from './GetPin';
const Comm = require('../comm');
const Constants = require('../../constants');
const { ipcRenderer } = require('electron');


class Instruction extends React.Component {

    constructor(){
        super();
        this.state = {
            isOpen:true,
            pin:'',
            intent: 'none',
            error: '',
            done: false,
            mounted: false,
        };
        this.onCancel = this.onCancel.bind(this);
        this.onDone = this.onDone.bind(this);
    }

    onCancel(){
        if (this.props.onCancel) this.props.onCancel();
    }
    onDone(err){
        this.setState({done: true})
        if (this.props.onDone) this.props.onDone(err);
    }

    componentDidMount(){
        if (!this.state.mounted){
            console.log('Waiting for bootloader mode...');
            Comm.sendRecv('bootloader-mode', this.props.device).then((res)=>{
                console.log('in bootloader mode?', res);
                this.onDone(res.error);
            });
        }
    }

    render(){
        return (
            <Overlay isOpen={true} onClose={this.onCancel} 
                className={Classes.OVERLAY_SCROLL_CONTAINER + ""}
                autoFocus={true}
                canEscapeKeyClose={true}
                canOutsideClickClose={true}
                enforceFocus={true}
                hasBackdrop={true}
                usePortal={true}
                useTallContent={false}
            >
                <Card elevation={Elevation.FOUR} className="docs-overlay-example-transition abs-center">
                    <div className="p-3">
                        <div className="d-flex flex-row bd-highlight ">
                            <div className="p-0 bd-highlight">
                                <H2>Please put your token into bootloader mode.</H2>
                            </div>
                        </div>

                        <div className="d-flex flex-row bd-highlight ">

                            <div className="p-0 bd-highlight">
                                <ol >
                                    <li>Remove the key.</li>
                                    <li>While holding down the button, plug key back in.</li>
                                    <li>Wait for about 2 seconds for LED for flash orange quickly</li>
                                </ol>
                            </div>
                        </div>
                        <div className="d-flex flex-row bd-highlight ">
                            <div className="p-0 bd-highlight">
                                Once the token is in bootloader mode, it will be detected and the update
                                will continue.  Or you can cancel.
                                </div>
                        </div>
                        <div className="d-flex flex-row bd-highlight justify-content-between pt-3">
                            <div className="col-2 p-0 bd-highlight">
                                <Button icon="cross" intent="danger" text="Cancel" className="p-3" onClick={this.onCancel} />
                            </div>
                        </div>
                    </div>
                </Card>
            </Overlay>
        );
    }
}




export default class UpdateTab extends React.Component {
    constructor() {
        super();
        this.state = {
            loading: false,
            needYes: false,
            mounted: false,
            autoupdated: false,
            waitForBootloaderMode: false,
            onBootloaderMode: function(){},
            onBootloaderModeCancel: function(){},
            error:'',
            status:'',
            progress: 0.0,
        }
        this.onUpdate = this.onUpdate.bind(this);
        this.waitForUserToPutIntoBootloaderMode= this.waitForUserToPutIntoBootloaderMode.bind(this);
    }


    async downloadFirmware() {
        var res = await fetch('https://api.github.com/repos/solokeys/solo/releases/latest');
        var json = await res.json();
        var tag = json.tag_name; //e.g. "2.5.3"
        var fw_url = '';
        for (var i = 0; i < json.assets.length; i++) {
            var parts = json.assets[i].name.split(tag);
            if (parts.length != 2) continue;

            if (parts[0] == 'firmware-hacker-' && parts[1] == '.hex') {
                console.log('found correct asset');
                fw_url = json.assets[i].browser_download_url;
                break;
            }
        }
        if (!fw_url)
            throw 'Could not find correct asset online.';

        res = await fetch(fw_url);
        var fileSize = parseInt(res.headers.get('Content-Length') || '0', 10);
        const reader = res.body.getReader();
        console.log('Downloading...');
        var chunks = [];
        var byteCount = 0;
        while (1) {
            var chunk = await reader.read();
            if (chunk.done) break;

            chunks.push(chunk.value);
            byteCount += chunk.value.byteLength;
            var progress = (byteCount / fileSize);
            this.setState({ progress: progress });
        }

        // Combine all the chunks into string.
        var fw = '';
        for (var i = 0; i < chunks.length; i++){
            var s = Util.bin2str(chunks[i]);
            fw += s;
        }
        return fw;
    }

    waitForUserToPutIntoBootloaderMode(){
        return new Promise((resolve, reject) => {
            this.setState({
                waitForBootloaderMode: true,
                onBootloaderMode: () => {
                    this.setState({ waitForBootloaderMode: false }, (err) => {
                        if (err){
                            reject(err)
                        } else {
                            resolve();
                        }
                    });
                },
                onBootloaderModeCancel: () => {
                    this.setState({ waitForBootloaderMode: false }, () => {
                        reject('User canceled');
                    });
                }
            });
        });
    }

    async onUpdate(){
        this.setState({loading:true, progress: 0.0, status: 'Downloading firmware...', error:''});

        var hexfile;
        try{
            hexfile = await this.downloadFirmware();
        } catch (e) {
            console.log(e);
            this.setState({error: e.toString(), loading: false});
            if (this.props.onFinish) this.props.onFinish(false);
            return;
        }

        console.log('got hex file: ', hexfile.slice(0,100));


        this.setState({ status: 'Erasing...', progress: 0.0 });

        this.props.device.fw = hexfile;
        var res = await Comm.sendRecv('update', this.props.device);
        console.log('update-res', res);

        if (res.error && res.code == Constants.ERROR.CTAP1_ERR_INVALID_COMMAND)
        {
            console.log('Need to boot into bootloader mode for this token.');
            try{
                await this.waitForUserToPutIntoBootloaderMode();
                res = await Comm.sendRecv('update', this.props.device);

            }catch(e){
                res.error = e.toString();
            }
        }

        this.setState({progress: 1.0, loading: false, error: res.error});
        if (this.props.onFinish) this.props.onFinish(! res.error);

        // var inter = setInterval(() => {
        //     var p = this.state.progress + 0.05;

        //     if (p > 0.21){
        //     }
        //     if (p > 0.41){
        //         this.setState({status: 'Writing new firmware...'});
        //     }

        //     if (p-0.0001 >= 1.0){
        //         console.log('done.');
        //         clearInterval(inter);
        //         this.setState({progress: 1.0, loading: false});
        //     } else {
        //         this.setState({progress: p});
        //     }
        // }, 100);
    }

    componentDidMount(){
        if (!this.state.mounted){
            // Subscribe to firmware write progress.
            ipcRenderer.on('progress', (event, arg) => {
                console.log('progress: ', arg);
                this.setState({ status: 'Writing...', progress: arg});
            });
            this.state.mounted = true;
        }
    }

    render() {
        var v = this.props.latestVersion;
        if (this.props.autoupdate && !this.state.autoupdated){ 
            this.setState({autoupdated: true,}, ()=>{
                this.onUpdate();
            });
        }
        return (
            <div>
                {
                    this.state.waitForBootloaderMode &&
                    <Instruction device={this.props.device}
                        onDone={()=>{this.state.onBootloaderMode()}}
                        onCancel={()=>{this.state.onBootloaderModeCancel()}}
                        />
                }
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        <p>Update device <span className="font-weight-bold"> {this.props.device.id}</span> to latest or custom firmware.</p>
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        Update firmware to: <Tag intent="primary">Latest: {v[0]+"."+v[1]+'.'+v[2]}</Tag>
                    </div>
                </div>

                <div className="d-flex flex-row bd-highlight ">

                    <div className="p-2 bd-highlight">
                        <Button icon="automatic-updates" 
                        intent="primary" disabled={this.state.loading}
                        text="Update" className="p-3 text-wrap" onClick={this.onUpdate} />
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className=" p-2 bd-highlight">
                        {
                            ((this.state.progress>=1.0)|| this.state.error) &&
                            (
                            this.state.error ? 
                                <div>
                                    <Icon icon="cross" intent="danger" />
                                    <Tag className="pl-2" intent="danger"><H5 className="mb-1">{this.state.error}</H5></Tag>
                                </div>
                            :
                                <H5>
                                    <Icon icon="tick" intent="success" />
                                    <span className="pl-2">Success.  Refresh to see updated firmware version.</span>
                                </H5>
                            )
                        }
                        {
                            this.state.loading &&
                            <div>
                                <div className="d-flex flex-row bd-highlight ">
                                    <Spinner className="" intent="primary" size={45} value={this.state.progress} />
                                </div>
                                <div className="d-flex flex-row bd-highlight ">
                                    <H5>{this.state.status}</H5>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        );
    }
}