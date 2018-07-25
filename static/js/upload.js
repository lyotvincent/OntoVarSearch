$(function() {
        var task_id = WebUploader.Base.guid();        //产生task_id
        var md5;
        var isupload = false;
        WebUploader.Uploader.register({
            "before-send-file": "beforeSendFile",
            "before-send": "beforeSend"
            // "after-send-file": "afterSendFile",
        },{
            //所有分块进行上传之前调用此函数
            beforeSendFile: function(file) {
                var deferred = WebUploader.Deferred();
                //计算md5, 发送给后台, 如果后台存在一致文件就跳过.
                var getmd5 = GetMd5(file);
                $.when(getmd5).done(function (val) {
                   md5 = val;
                    $.ajax({
                        type: "POST",
                        url: "/upload/uploadcheckfile",
                        data: {
                            //文件唯一标记
                            fileMd5: md5
                        },
                        async: false,
                        dataType: "json",
                        success: function (data) {
                            // data = JSON.parse(data);
                            if (data.isExist) {
                                //文件存在，跳过
                                isupload = true;
                                deferred.reject();
                            } else {
                                isupload = false;
                                WebUploader.Uploader.options.formData.fileMd5 = md5;
                                //文件不存在或不完整，继续发送
                                deferred.resolve();
                            }
                        }
                    });
                });
                return deferred.promise();
            },

            //如果有分块上传，则每个分块上传之前调用此函数
            beforeSend: function (block) {
                var deferred = WebUploader.Deferred();

                $.ajax({
                    type: "POST",
                    url: "/upload/uploadcheckchunk",
                    data: {
                        //文件唯一标记
                        fileMd5: md5,
                        //当前分块下标
                        chunk: block.chunk
                    },
                    async: false,
                    dataType: "json",
                    success: function (response) {
                        if (response.isExist) {
                            //分块存在，跳过
                            deferred.reject();
                        } else {
                            //分块不存在或不完整，重新发送该分块内容
                            deferred.resolve();
                        }
                    }
                });

                this.owner.options.formData.fileMd5 = md5;
                this.owner.options.formData.chunk = block.chunk;
                return deferred.promise();
            }
        });
        var uploader = WebUploader.create({           //创建上传控件
            swf: '/static/plugins/webuploader/Uploader.swf', //swf位置，flash有关
            server: '/upload/doupload',                 //接收每一个分片的服务器地址
            pick: '#picker',                          //填上传按钮的id选择器值
            auto: true,                               //选择文件后，是否自动上传
            chunked: true,                            //是否分片
            chunkSize: 20 * 1024 * 1024,              //每个分片的大小，这里为20M
            chunkRetry: 3,                            //某分片若上传失败，重试次数
            threads: 1,                               //线程数量，考虑到服务器，这里就选了1
            duplicate: true,                          //分片是否自动去重
            formData: {                               //每次上传分片，一起携带的数据
                task_id: task_id,
                fileMd5: -1,
                chunk: -1
            },
            accept:{
                title: 'VCF',
                extensions: 'vcf',
                mimeTypes: '.vcf'
            }
        });
        uploader.on('startUpload', function() {       //开始上传时，调用该方法
            $('#progress-bar-upload').css('width', '0%');
            // $('#progress-bar-upload').text('0%');
        });

        uploader.on('uploadProgress', function(file, percentage) { //一个分片上传成功后，调用该方法
            //上传成功达到50%
            $('#progress-bar-upload').css('width', (percentage * 100 - 1)/2 + '%');
            $('#progress-bar-upload').text("Uploading file...")
            //$('#progress-bar-upload').text(Math.floor((percentage * 100 - 1)/2) + '%');
        });

        uploader.on('uploadSuccess', function(file) { //整个文件的所有分片都上传成功，调用该方法
            //上传的信息（文件唯一标识符，文件名）
            var data = {'task_id': task_id, 'name': file.source['name'], 'fileMd5': md5 };
            //ajax携带data向该url发请求
            DoProcess(data);
            $('#progress-bar-upload').css('width', '50%');
            $('#progress-bar-upload').text('Upload complete. Merging files...');
        });

        uploader.on('uploadError', function(file) {   //上传过程中发生异常，调用该方法
            var data = {'task_id': task_id, 'name': file.source['name'], 'fileMd5': md5 };
            if (isupload){
                //如果文件已经存在, 继续处理
                DoProcess(data);
            }else{
                $('#progress-bar-upload').css('width', '100%');
                $('#progress-bar-upload').text('Upload fail');
            }
        });

        uploader.on('uploadComplete', function(file) {//上传结束，无论文件最终是否上传成功，该方法都会被调用
            $('#progress-bar-upload').removeClass('active progress-bar-striped');
        });

});

// 计算md5
function GetMd5(file) {
    //计算md5方法: 文件前2M(如果不足,全部计算) + 文件大小
    var chunkSize = 2 * 1024 * 1024
    var start = 0,
    end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
    var spark = new SparkMD5();
    var fr = new FileReader();
    //file的slice方法
    var blob = file.getSource(),
        blobSlice = blob.mozSlice || blob.webkitSlice || blob.slice;

    fr.readAsArrayBuffer(blobSlice.call(blob,start,end).getSource());
    var deferred = $.Deferred();
    fr.onload = function (e) {
        // alert("onload");
        spark.append(e.target.result);
        spark.append(blob.size);
        // spark.append(blob.lastModifiedDate);
        deferred.resolve(spark.end());
    };
    return deferred.promise();
}

//通知后台, 做转换,导入数据库 操作
function DoProcess(data) {
    var uploadpromise = $.post('/upload/uploadcomplete', data);
    var convertpromise = uploadpromise.then(function () {
        $('#progress-bar-upload').css('width', '60%');
        $('#progress-bar-upload').text('Converting file to json...');
        return $.post('/upload/convert', data);
    });
    var importDBpromise = convertpromise.then(function () {
        $('#progress-bar-upload').css('width', '80%');
        $('#progress-bar-upload').text('Importing json to mongodb...');
        return $.post('/upload/importDB', data);
    });
    importDBpromise.done(function () {
        $('#progress-bar-upload').css('width', '100%');
        $('#progress-bar-upload').text('Success. you can search in this file');
    });
}