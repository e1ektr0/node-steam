module.exports =  function(useSocks, customSocket){

  var MAGIC = 'VT01';

  var Connection = {
    socket: customSocket,
    setTimeout: function(value) {
      this.socket.setTimeout(value);
    },
    send: function(data) {
      // encrypt
      if (this.sessionKey) {
        data = require('steam-crypto').symmetricEncrypt(data, this.sessionKey);
      }
      
      var buffer = new Buffer(4 + 4 + data.length);
      buffer.writeUInt32LE(data.length, 0);
      buffer.write(MAGIC, 4);
      data.copy(buffer, 8);
      try {
        this.socket.write(buffer);
      }catch(e)
      {
        console.log("UNABLE TO SEND PACKET: "+e);
        this.socket.emit('close');
        this.destroy();
        this.removeAllListeners();
      }
    },
    on: function(name, fun) {
      this.socket.on(name, fun);
    },
    destroy:function() {
      //
    },
    connect:function(params) {
      this.socket.emit('connect');
    },
    removeAllListeners: function(){
      //
    },
    _readPacket: function() {
      if (!this._packetLen) { 
        var header = this.socket.read(8);
        if (!header) {
          return;
        }
        this._packetLen = header.readUInt32LE(0);
      }
      
      var packet = this.socket.read(this._packetLen);
      
      if (!packet) {
        this.socket.emit('debug', 'incomplete packet');
        return;
      }
      
      delete this._packetLen;
      
      // decrypt
      if (this.sessionKey) {
        packet = require('steam-crypto').symmetricDecrypt(packet, this.sessionKey);
      }
      
      this.socket.emit('packet', packet);
      
      // keep reading until there's nothing left
      this._readPacket();
    }
  }
  customSocket.on('readable', Connection._readPacket.bind(Connection))
  
  return Connection;
}
