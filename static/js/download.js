$(function () {
    GetFilelist();
});

function GetFilelist() {
    $.post('/download/showfiellist').done(function (data) {
        var downloadtable = $('#DataTable_Files').DataTable({
            bLengthChange:false,    //每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: true,//自动宽度
            paging: false,  // 分页
            destroy: true,
            scrollY: "550px",
            scrollCollapse: "true",
            columns:[
                {
                    "title": "File",
                    "data": "filename_zip",
                    "className": "gridtitle",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
                    }
                }
            ],
            data:data,
            "columnDefs": [// 定义操作列,######以下是重点########
                { "sWidth": "80%", "aTargets": [ 0 ] } ,
                {
                "targets": 1,//操作按钮目标列
                "data": null,
                "orderable" : false,
                "render": function (data, type, row) {
                    var target = '"' + row.filepath + row.filename_zip + '"';
                    var filemd5 = row.filemd5;
                    var html = "<a href='/download/dodownload/?fileMD5=" + filemd5 +"' class='button button-raised button-primary'  ><i class='fa fa-cloud-download'></i> Download </a>"
                    // html += "<a href='javascript:void(0);' class='up btn btn-default btn-xs'><i class='fa fa-arrow-up'></i> 编辑</a>"
                    // html += "<a href='javascript:void(0);'   onclick='deleteThisRowPapser(" + id + ")'  class='down btn btn-default btn-xs'><i class='fa fa-arrow-down'></i> 删除</a>"
                    return html;
                }
            }]
        })
    })
}
