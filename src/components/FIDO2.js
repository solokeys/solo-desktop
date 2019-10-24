import React from 'react';
import { Spinner, H3, Button, Card, Tag, Collapse, Classes, HTMLTable, Icon} from "@blueprintjs/core";
const Comm = require('../comm');



class InfoRow extends React.Component {
    render() {
        var cn = this.props.className || '';
        return (
            <div className={"d-flex flex-row bd-highlight mt-2 " + cn} >
                {this.props.label && 
                    <span><span className="">{this.props.label}</span>:&nbsp;</span>
                }
                {this.props.children}
            </div>
        )
    }
}

export default class FIDO2Tab extends React.Component {
    constructor() {
        super();
        this.state = {
            loading: false,
            status: 'Device is ready',
            statusIntent: 'success',
            verifyResponse: null,
            registerResponse: null,
            authenticateResponse: null,
        }
        this.register = this.register.bind(this);
        this.verify= this.verify.bind(this);
        this.authenticate= this.authenticate.bind(this);
    }

    async authenticate(){
        if (!this.state.registerResponse){
            this.setState({ loading: false, status: 'Need to register first.', statusIntent: 'danger' });
            return;
        }
        this.setState({ loading: true, status: 'Press button on device...', statusIntent: 'warning' });

        this.props.device.user = this.state.registerResponse;

        var auth = await Comm.sendRecv('authenticate', this.props.device);

        if (auth.error){
            this.setState({loading:false, status: 'Error: ' + auth.error, statusIntent: 'danger'});

        }else {
            this.setState({loading:false, status: 'Device is ready.', statusIntent: 'success',
            authenticateResponse: auth});
        }

    }

    async register(){
        console.log('getting register...', this.props.device);

        this.setState({loading:true, status: 'Press button on device...', statusIntent: 'warning'});

        var reg = await Comm.sendRecv('register', this.props.device);

        if (reg.error){
            this.setState({loading:false, status: 'Error: ' + reg.error, statusIntent: 'danger'});

        }else {
            this.setState({loading:false, status: 'Device is ready.', statusIntent: 'success',
            registerResponse: reg});
        }

        console.log('reg',reg);

    }

    // shameless duplication
    async verify(){
        console.log('getting register...', this.props.device);

        this.setState({loading:true, status: 'Press button on device...', statusIntent: 'warning'});

        var reg = await Comm.sendRecv('register', this.props.device);

        if (reg.error){
            this.setState({loading:false, status: 'Error: ' + reg.error, statusIntent: 'danger'});

        }else {
            this.setState({loading:false, status: 'Device is ready.', statusIntent: 'success',
            verifyResponse: reg});
        }

        console.log('reg',reg);

    }

    render() {
        return (
            <div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        <p>Test FIDO2 features for device <span className="font-weight-bold"> {this.props.device.id}</span>.</p>
                        <p><Tag intent={this.state.statusIntent}>{this.state.status}</Tag></p>
                    </div>
                    <div className="p-2 bd-highlight">
                        {
                            this.state.loading &&
                            <Spinner className="" intent="primary" size={45} />
                        }
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight justify-content-between">
                    <div className="col-3 p-0 bd-highlight">
                        <div className="d-flex flex-row bd-highlight mb-0">
                            <Button icon="shield" intent="warning" text="Verify" className="p-3" onClick={this.verify}/>
                        </div>
                        {
                            this.state.verifyResponse &&
                            <span className="mt-3">
                                <InfoRow className="">
                                    {
                                        this.state.verifyResponse.variant == 'solokeys' &&
                                        <span>
                                            <Icon icon="tick" intent="success" />
                                            Device is authentic from SoloKeys.
                                        </span>
                                    }
                                    {
                                        this.state.verifyResponse.variant == 'hacker' &&
                                        <span>
                                            <Icon icon="build" intent="primary" />
                                            Hacker build device.
                                        </span>
                                    }
                                    {
                                        this.state.verifyResponse.variant == 'other' &&
                                        <span>
                                            <Icon icon="help" intent="danger" />
                                            Unrecognized device.
                                        </span>
                                    }
                                </InfoRow>
                            </span>
                        }
                    </div>
                    <div className="col-3 p-0 bd-highlight mb-3">
                        <div className="d-flex flex-row bd-highlight mb-0">
                            <Button icon="user" intent="primary" text="Register" className="p-3" onClick={this.register}/>
                        </div>
                        {
                            this.state.registerResponse&&
                            <span className="mt-2">
                                <InfoRow>
                                    <Icon icon="tick" intent="success"/>
                                    Success.
                                </InfoRow>

                                <InfoRow label="counter">
                                    {this.state.registerResponse.count}
                                </InfoRow>
                            </span>
                        }


                    </div>


                    <div className="col-3 p-0 bd-highlight">
                        <div className="d-flex flex-row bd-highlight mb-0">
                            <Button icon="key" intent="success" text="Authenticate" className="p-3" onClick={this.authenticate} />
                        </div>
                        {
                            this.state.authenticateResponse&&

                            <span className="mt-2">
                                <InfoRow>
                                    <Icon icon="tick" intent="success"/>
                                    Success.
                                </InfoRow>

                                <InfoRow label="count">
                                    {this.state.authenticateResponse.count}
                                </InfoRow>
                                {/* <InfoRow label="clientDataHash">
                                    {this.state.authenticateResponse.cdh}
                                </InfoRow>
                                <InfoRow label="signature">
                                    {this.state.authenticateResponse.signature}
                                </InfoRow> */}
                            </span>
                        }
                    </div>
                </div>

            </div>
        );
    }
}