let hasGmap = false;
let restaurantList = [];
let cityLat;
let cityLon;
let restaurantArray;

xhr = new XMLHttpRequest();
$('#zip').focus();

$('#cuisine').change(() => {
    $('#card-group').empty();
    let selection = $('#cuisine').val();
    let restaurant = $('#restaurant').val();
    getlistOfRestaurants(cityLat, cityLon, selection, restaurant);
    $('#navbarToggleExternalContent').collapse('hide');
});

$('#search').click((e) => {
    $('#card-group').empty();
    let selection = $('#cuisine').val();
    let restaurant = $('#restaurant').val();
    getlistOfRestaurants(cityLat, cityLon, selection, restaurant);
    $('#navbarToggleExternalContent').collapse('hide');
});

$('#get-city').click((e) => {
    $('#restaurant').val('');
    $('#restaurant').prop('disabled', true);
    $('#search').prop('disabled', true);
    $('#cuisine').val('');
    $('#cuisine').prop('disabled', true);
    zipCodeEntered();
});

$('#clear').click((e) => {
    $('#zip').val('');
    $('#restaurant').val('');
    $('#restaurant').prop('disabled', true);
    $('#search').prop('disabled', true);
    $('#cuisine').val('');
    $('#cuisine').prop('disabled', true);
    $('#card-group').empty();
    $('#city').html('');
    $('#zip').focus();
});

$('#zip').on('keypress', (e) => {
    $('#restaurant').val('');
    $('#restaurant').prop('disabled', true);
    $('#search').prop('disabled', true);
    $('#cuisine').val('');
    $('#cuisine').prop('disabled', true);

    if (e.keyCode == 13) {
        e.preventDefault();
        zipCodeEntered();
    }
});

async function zipCodeEntered() {
    $('#restaurant').prop('disabled', false);
    $('#search').prop('disabled', false);
    let zip = $('#zip').val();
    let cityLocation = await getLatLng(zip);

    if (!cityLocation) {
        cityLocation = {
            lat: 40.577215,
            lng: -77.594528,
            city: 'State College'
        };
    }

    if (cityLocation.lat && cityLocation.lng) {
        $('#city').html(cityLocation.city);
        getCuisines(cityLocation.lat, cityLocation.lng);
        cityLat = cityLocation.lat;
        cityLon = cityLocation.lng;
        $('#card-group').empty();
        let selection;
        let restaurant;
        getlistOfRestaurants(cityLat, cityLon, selection, restaurant);
    } else {
        $('#city').html("Zip Code could not be resolved");
    }
    $('#navbarToggleExternalContent').collapse('hide');
}

$('.card-img-top').click((e) => {
    alert('click');
    showRestaurant();
});

async function showRestaurant(index) {
    console.log(index);
    let restaurant = restaurantArray[index].restaurant;
    console.log(restaurant.id);

    $('#single-restaurant').append(buildModal(restaurant));
    if (!hasGmap) {
        $('body').append(mapScript(restaurant));
        hasGmap = true;
    } else {
        initMap();
    }

    let reviews = await getReviews(restaurant.id);
    console.log(reviews);

    let reviewHTML = `<ul class="list-group list-group-flush">
                      </ul>`;
    $('#reviews').append(reviewHTML);

    reviews.forEach(review => {
        if (review.review.review_text) {
            $('#reviews .list-group').append(makeReviewItem(review));
        }
    });

    $('#single-restaurant').modal({
        show: true,
        focus: true,
        keyboard: true
    });
}

$('#single-restaurant').on('hidden.bs.modal', function (e) {
    $('#single-restaurant').empty();
})

$('#single-restaurant').on('hide.bs.modal', function (event) {
    $('#single-restaurant').empty();
});

function setHeader(xhr) {
    xhr.setRequestHeader('user-key', zomatoKey);
}

async function getlistOfRestaurants(lat = 40.577215, long = -77.594528, cuisine, restaurant) {

    if (!lat || !long) {
        return;
    }

    $('.spinner-border').toggleClass('d-none');

    let zomatoURL = `https://developers.zomato.com/api/v2.1/search?lat=${lat}&lon=${long}&sort=rating&order=desc`;

    if (cuisine) {
        zomatoURL += `&cuisines=${cuisine}`;
    }

    if (restaurant) {
        zomatoURL += `&q=${restaurant}`;
    }

    let results = await getZomatoJson(zomatoURL);

    if (results) {
        let resultList = $('#restaurants');
        resultList.empty();
        console.log(results['restaurants']);
        restaurantArray = results['restaurants'];
        results['restaurants'].forEach((result, index) => {
            result.restaurant.index = index;
            $('#card-group').append(makeCard(result.restaurant));
        });
    }
    $('.spinner-border').toggleClass('d-none');
}

async function getCuisines(lat = 40.577215, long = -77.594528) {

    let cuisineURL = `https://developers.zomato.com/api/v2.1/cuisines?lat=${lat}&lon=${long}`;
    let results = await getZomatoJson(cuisineURL);

    if (results) {
        let dropdown = $('#cuisine');
        let cuisines = results['cuisines'];
        clearCuisines();
        cuisines.forEach(cuisine => {
            dropdown.append(`<option value="${cuisine.cuisine.cuisine_id}">${cuisine.cuisine.cuisine_name}</option> `)
        });
        dropdown.prop('disabled', false);
    }
}

// uses Google GeoLocation API
async function getLatLng(zip) {
    let lat = '';
    let long = '';
    let city = '';

    let zipURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&region=us&key=${googleGeoApi}`;

    await $.getJSON(zipURL, (json) => {
        // console.log(json.results[0]);
        json = json.results[0];
        lat = json.geometry.location.lat;
        long = json.geometry.location.lng;
        city = json.formatted_address;
    }).done(() => {
        console.log(`lat: ${lat} lon: ${long}`);
    }).fail((e) => {
        return {
            lat: 40.577215,
            lng: -77.594528,
            city: 'State College'
        };
    });

    return {
        lat: lat,
        lng: long,
        city: city
    };

}

function clearCuisines() {
    let dropdown = $('#cuisine');
    dropdown.empty();
    dropdown.append('<option value="">--Select Cuisine--</option>');
    dropdown.val('');
}

async function getZomatoJson(endPoint) {
    let json;
    await $.ajax({
        url: endPoint,
        type: 'GET',
        datatype: 'json',
        beforeSend: setHeader
    }).done(function (results) {
        json = results;
    }).fail((jqxhr, textStatus, error) => {
        alert(textStatus + ', ' + error);
        console.log(textStatus + ', ' + error);
        json = false;
    });
    return json;
}

async function getReviews(resId) {
    if (!resId) {
        return;
    }

    let zomatoReviewUrl = `https://developers.zomato.com/api/v2.1/reviews?res_id=${resId}&count=4`;

    let results = await getZomatoJson(zomatoReviewUrl);

    return results.user_reviews;
}

function makeCard(restaurant) {
    return `<div class="col mb-4">
                <div class="card h-100" style="width: 18rem;">
                    <div class="card-block stretched-link text-decoration-none" onclick="showRestaurant(${restaurant.index})">
                    <img src="${restaurant.featured_image || 'placeholder.jpg'}" class="card-img-top" alt="">
                    </div>
                    <div class="card-body">
                        <span class="badge badge-secondary float-right" style="background-color: #${restaurant.user_rating.rating_color}">${restaurant.user_rating.aggregate_rating}</span>
                        <h5 class="card-title">${restaurant.name}</h5>
                        <p class="card-text">${restaurant.location.address}<br />${restaurant.phone_numbers}</p>
                        <p class="card-text">Cuisines: ${restaurant.cuisines}</p>
                        <p class="card-text">${restaurant.average_cost_for_two ? "Avg cost for 2: " + restaurant.currency + restaurant.average_cost_for_two : ""}</p>
                        <p class="card-text">Rating: <span style="color: #${restaurant.user_rating.rating_color}">${restaurant.user_rating.rating_text}</span></p>
                    </div>
                </div>
            </div>`;
}

function buildModal(restaurant) {
    let modal = `<div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${restaurant.name}</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true" style="font-size: 1.5rem;">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="card float-left mx-3" style="width: 13rem;">
                                <img onclick="window.open('${restaurant.featured_image || 'placeholder.jpg'}')" src="${restaurant.featured_image || 'placeholder.jpg'}" class="card-img-top" alt="">
                            </div>
                            <div class="card border-0" style="font-size: 0.75rem;">
                                <div id="map"></div>
                            </div>
                            <div id="reviews" class="card-body scroll float-left mt-2" style="font-size: 0.75rem;">
                            </div>
                        </div>
                    </div>
                </div>
                <script>
                    var lat = ${restaurant.location.latitude};
                    var lng = ${restaurant.location.longitude};
                    var rname = "${restaurant.name}";
                    var rloc = "${restaurant.location.address}";
                </script>`;

    return modal;
}

function makeReviewItem(review) {
    let reviewItem = `<li class="list-group-item">
                        <span class="float-right">${review.review.review_time_friendly}</span>
                        <h6>${review.review.user.name}</h6>
                        <p>${review.review.review_text}</p>
                        </li>`;

    return reviewItem;
}

function mapScript(restaurant) {
    let gmap = `<script>
            var map;
            var center = { lat: lat, lng: lng };
            function initMap() {
                var center = { lat: lat, lng: lng };
                map = new google.maps.Map(document.getElementById('map'), {
                    center: center,
                    zoom: 15,
                    scrollwheel: true
                });
                var contentString = "<strong>" + rname + "</strong><p>" + rloc + "</p>";
                var infowindow = new google.maps.InfoWindow({
                    content: contentString
                });
                var marker = new google.maps.Marker({
                    position: center,
                    map: map
                });
                marker.addListener('click', function () {
                    infowindow.open(map, marker);
                });
            }
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBe-Piv9VcT8gCXPp8bMEHdeUSgMxPV4Xw&callback=initMap" async defer></script>`;

    return gmap;
}

// zipcode API requires index.html be served from VS Code Live server (url must be 127.0.0.1)
// async function getLatLng(zip) {
//     let lat = '';
//     let long = '';
//     let city = '';

//     let zipURL = `https://www.zipcodeapi.com/rest/${zipApiKey}/info.json/${zip}/degrees`;

//     await $.getJSON(zipURL, (json) => {
//         lat = json.lat;
//         long = json.lng;
//         city = json.city;
//     }).done(() => {
//         console.log(`lat: ${lat} lon: ${long}`);
//     }).fail((e) => {
//         return {
//             lat: 40.577215,
//             lng: -77.594528,
//             city: 'State College'
//         };
//     });

//     return {
//         lat: lat,
//         lng: long,
//         city: city
//     };

// }
