import React from 'react';
import { H1,H2,H3,H4,H5,
    Spinner, Classes, Button, Card, Tag, Overlay, Icon,
        Elevation, InputGroup, FormGroup} from "@blueprintjs/core";
import { timingSafeEqual } from 'crypto';
import GetPin from './GetPin';
const Comm = require('../comm');
const Constants = require('../../constants');

export default class PINTab extends React.Component {
    constructor() {
        super();
        this.state = {
            loading: false,
            response: false,
            needPin: false,
            pin:'',
            error:'',
        }
        this.onPINChange = this.onPINChange.bind(this);
        this.onSubmit= this.onSubmit.bind(this);
        this.onCurrentPin= this.onCurrentPin.bind(this);
    }
    onPINChange(e,){
        this.setState({pin: e.target.value})
    }
    async onSubmit(){
        if (this.state.pin.length < 4){
            this.setState({error: 'PIN must be at least 4 characters.'});
            return;
        }

        if (this.props.device.hasPin){
            console.log('Changing PIN...');
            this.setState({needPin:true});
        } else {
            console.log('Setting PIN...');

            this.props.device.pin = this.state.pin;

            this.setState({loading: true, needPin: false, error: ''});
            var res = await Comm.sendRecv('setPin', this.props.device);
            this.setState({loading: false});

            if (res.error) {
                this.setState({ error: res.error });
            }
            else{
                this.setState({response:true});
            }
        }
    }

    async onCurrentPin(pin, pinToken){
        this.props.device.opts = {};
        this.props.device.opts.pinToken = pinToken;
        this.props.device.pin = pin;
        this.props.device.newPin = this.state.pin;
        console.log('Got pinToken, changing PIN...');

        this.setState({loading: true, needPin: false, error:''});
        var res = await Comm.sendRecv('changePin', this.props.device);
        this.setState({loading: false});

        if(res.error){
            this.setState({error: res.error});
        }
        else {
            this.setState({ response: true });
        }
    }



    render() {
        return (
            <div>
                {this.state.needPin &&
                    <GetPin isOpen={true} device={this.props.device} onContinue={this.onCurrentPin}
                        onCancel={()=>(this.setState({needPin:false, loading:false, response: false,}))}/>
                }
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        <p>Manage PIN for <span className="font-weight-bold"> {this.props.device.id}</span>.</p>
                    </div>
                    <div className="p-2 bd-highlight">
                        {
                            this.state.loading &&
                            <Spinner className="" intent="primary" size={45} />
                        }
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        Enter a new PIN.  {this.props.device.hasPin &&
                            "You already have a PIN set.  You will be prompted for your current PIN." 
                        }
                    </div>
                </div>

                <div className="d-flex flex-row bd-highlight ">

                    <div className="col-4 p-2 bd-highlight">
                                <InputGroup
                                    className=""
                                    leftIcon="lock"
                                    placeholder="New PIN"
                                    large={true}
                                    type="password"
                                    intent={this.state.error ? 'danger' : 'none'}
                                    onChange={this.onPINChange}
                                    rightElement={this.state.loading && <Spinner className="" intent="primary" size={20} />}
                                />
                    </div>
                    <div className="col-2 p-2 bd-highlight">
                        <Button icon="arrow-right" intent="success" text={this.props.device.hasPin ? "Change PIN" : "Set PIN"} className="p-3 text-wrap" onClick={this.onSubmit} />
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className=" p-2 bd-highlight">
                        {
                            (this.state.response || this.state.error) &&
                            (
                            this.state.error ? 
                                <div>
                                    <Icon icon="cross" intent="danger" />
                                    <Tag className="pl-2" intent="danger"><H5 className="mb-1">{this.state.error}</H5></Tag>
                                </div>
                            :
                                <H5>
                                    <Icon icon="tick" intent="success" />
                                    <span className="pl-2">Success</span>
                                </H5>
                            )
                        }
                    </div>
                </div>
            </div>
        );
    }
}