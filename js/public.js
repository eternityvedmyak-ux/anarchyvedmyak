var i =0; //moder
var app = {
    monitor_timeout: 10000,
    requests: 100,
    renderOffline: function () {
        $('.online').html('Онлайн: <span class="srv-offline" style="color:#ff6a6a;font-weight:bold">оффлайн</span>');
        $('#progress').width('0');
    },
    monitor: function () {
        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });
        $.ajax({
            url: '/server/statistic',
            dataType: 'json',
            type: 'GET',
            async: true,
            cache: false,
            contentType: false,
            processData: false,
            data: {
            },
            error: function (data, textStatus, xhr) {
                if (typeof error != 'undefined') {
                    error(data, textStatus, xhr);
                } else {

                }
                app.renderOffline();
                setTimeout(function () {
                    i++;
                    if(i < app.requests) {
                    app.monitor();
                    }
                }, app.monitor_timeout);
            },
            success: function (data) {
                if (!data || data.online === false) {
                    app.renderOffline();
                } else {
                    var online = (!data.players) ? 0 : data.players;
                    var slots = data.slots;
                    $('.online').html('Онлайн: <span id="online">' + online + '</span>/<span id="slots">' + slots + '</span>');
                    var progress = (!slots) ? 0 : online / (slots / 100);
                    $('#progress').width(progress.toFixed(4) + '%');
                }
                setTimeout(function () {
                    i++;
                    if(i < app.requests) {
                        app.monitor();
                    }
                }, app.monitor_timeout);
            }
        });
    },

}
