const db = require("./database/database");
const fs = require("fs");
const vm = require("vm");

/*
 * Restores the State -> District -> City/Town location master data
 * from the supplied location-data(1).js file.
 *
 * IMPORTANT:
 * - Does NOT delete clients, tasks, billing, documents, users, etc.
 * - Safe to run after the full data reset.
 * - Existing identical locations are skipped.
 */

const stateDistrictData = {

        "Andhra Pradesh": [
            "Alluri Sitharama Raju",
            "Anakapalli",
            "Anantapur",
            "Annamayya",
            "Bapatla",
            "Chittoor",
            "Dr. B.R. Ambedkar Konaseema",
            "East Godavari",
            "Eluru",
            "Guntur",
            "Kakinada",
            "Krishna",
            "Kurnool",
            "Nandyal",
            "NTR",
            "Palnadu",
            "Parvathipuram Manyam",
            "Prakasam",
            "Srikakulam",
            "Sri Sathya Sai",
            "Tirupati",
            "Visakhapatnam",
            "Vizianagaram",
            "West Godavari",
            "YSR Kadapa"
        ],

        "Arunachal Pradesh": [
            "Anjaw",
            "Changlang",
            "Dibang Valley",
            "East Kameng",
            "East Siang",
            "Itanagar Capital Complex",
            "Kamle",
            "Kra Daadi",
            "Kurung Kumey",
            "Lepa Rada",
            "Lohit",
            "Longding",
            "Lower Dibang Valley",
            "Lower Siang",
            "Lower Subansiri",
            "Namsai",
            "Pakke Kessang",
            "Papum Pare",
            "Shi Yomi",
            "Siang",
            "Tawang",
            "Tirap",
            "Upper Siang",
            "Upper Subansiri",
            "West Kameng",
            "West Siang"
        ],

        "Assam": [
            "Baksa",
            "Bajali",
            "Barpeta",
            "Biswanath",
            "Bongaigaon",
            "Cachar",
            "Charaideo",
            "Chirang",
            "Darrang",
            "Dhemaji",
            "Dhubri",
            "Dibrugarh",
            "Dima Hasao",
            "Goalpara",
            "Golaghat",
            "Hailakandi",
            "Hojai",
            "Jorhat",
            "Kamrup",
            "Kamrup Metropolitan",
            "Karbi Anglong",
            "Karimganj",
            "Kokrajhar",
            "Lakhimpur",
            "Majuli",
            "Morigaon",
            "Nagaon",
            "Nalbari",
            "Sivasagar",
            "Sonitpur",
            "South Salmara-Mankachar",
            "Tamulpur",
            "Tinsukia",
            "Udalguri",
            "West Karbi Anglong"
        ],

        "Bihar": [
            "Araria",
            "Arwal",
            "Aurangabad",
            "Banka",
            "Begusarai",
            "Bhagalpur",
            "Bhojpur",
            "Buxar",
            "Darbhanga",
            "East Champaran",
            "Gaya",
            "Gopalganj",
            "Jamui",
            "Jehanabad",
            "Kaimur",
            "Katihar",
            "Khagaria",
            "Kishanganj",
            "Lakhisarai",
            "Madhepura",
            "Madhubani",
            "Munger",
            "Muzaffarpur",
            "Nalanda",
            "Nawada",
            "Patna",
            "Purnia",
            "Rohtas",
            "Saharsa",
            "Samastipur",
            "Saran",
            "Sheikhpura",
            "Sheohar",
            "Sitamarhi",
            "Siwan",
            "Supaul",
            "Vaishali",
            "West Champaran"
        ],

        "Chhattisgarh": [
            "Balod",
            "Baloda Bazar",
            "Balrampur",
            "Bastar",
            "Bemetara",
            "Bijapur",
            "Bilaspur",
            "Dantewada",
            "Dhamtari",
            "Durg",
            "Gariaband",
            "Gaurela-Pendra-Marwahi",
            "Janjgir-Champa",
            "Jashpur",
            "Kabirdham",
            "Kanker",
            "Khairagarh-Chhuikhadan-Gandai",
            "Kondagaon",
            "Korba",
            "Korea",
            "Mahasamund",
            "Manendragarh-Chirmiri-Bharatpur",
            "Mungeli",
            "Narayanpur",
            "Raigarh",
            "Raipur",
            "Rajnandgaon",
            "Sakti",
            "Sarangarh-Bilaigarh",
            "Sukma",
            "Surajpur",
            "Surguja"
        ],

        "Goa": [
            "North Goa",
            "South Goa"
        ],

        "Haryana": [
            "Ambala",
            "Bhiwani",
            "Charkhi Dadri",
            "Faridabad",
            "Fatehabad",
            "Gurugram",
            "Hisar",
            "Jhajjar",
            "Jind",
            "Kaithal",
            "Karnal",
            "Kurukshetra",
            "Mahendragarh",
            "Nuh",
            "Palwal",
            "Panchkula",
            "Panipat",
            "Rewari",
            "Rohtak",
            "Sirsa",
            "Sonipat",
            "Yamunanagar"
        ],

        "Himachal Pradesh": [
            "Bilaspur",
            "Chamba",
            "Hamirpur",
            "Kangra",
            "Kinnaur",
            "Kullu",
            "Lahaul and Spiti",
            "Mandi",
            "Shimla",
            "Sirmaur",
            "Solan",
            "Una"
        ],

        "Jharkhand": [
            "Bokaro",
            "Chatra",
            "Deoghar",
            "Dhanbad",
            "Dumka",
            "East Singhbhum",
            "Garhwa",
            "Giridih",
            "Godda",
            "Gumla",
            "Hazaribagh",
            "Jamtara",
            "Khunti",
            "Koderma",
            "Latehar",
            "Lohardaga",
            "Pakur",
            "Palamu",
            "Ramgarh",
            "Ranchi",
            "Sahibganj",
            "Seraikela Kharsawan",
            "Simdega",
            "West Singhbhum"
        ],

        "Karnataka": [
            "Bagalkot",
            "Ballari",
            "Belagavi",
            "Bengaluru Rural",
            "Bengaluru Urban",
            "Bidar",
            "Chamarajanagar",
            "Chikkaballapur",
            "Chikkamagaluru",
            "Chitradurga",
            "Dakshina Kannada",
            "Davanagere",
            "Dharwad",
            "Gadag",
            "Hassan",
            "Haveri",
            "Kalaburagi",
            "Kodagu",
            "Kolar",
            "Koppal",
            "Mandya",
            "Mysuru",
            "Raichur",
            "Ramanagara",
            "Shivamogga",
            "Tumakuru",
            "Udupi",
            "Uttara Kannada",
            "Vijayapura",
            "Yadgir"
        ],

        "Kerala": [
            "Alappuzha",
            "Ernakulam",
            "Idukki",
            "Kannur",
            "Kasaragod",
            "Kollam",
            "Kottayam",
            "Kozhikode",
            "Malappuram",
            "Palakkad",
            "Pathanamthitta",
            "Thiruvananthapuram",
            "Thrissur",
            "Wayanad"
        ],

        "Madhya Pradesh": [
            "Agar Malwa",
            "Alirajpur",
            "Anuppur",
            "Ashoknagar",
            "Balaghat",
            "Barwani",
            "Betul",
            "Bhind",
            "Bhopal",
            "Burhanpur",
            "Chhatarpur",
            "Chhindwara",
            "Damoh",
            "Datia",
            "Dewas",
            "Dhar",
            "Dindori",
            "Guna",
            "Gwalior",
            "Harda",
            "Indore",
            "Jabalpur",
            "Jhabua",
            "Katni",
            "Khandwa",
            "Khargone",
            "Maihar",
            "Mandla",
            "Mandsaur",
            "Mauganj",
            "Morena",
            "Narmadapuram",
            "Narsinghpur",
            "Neemuch",
            "Niwari",
            "Panna",
            "Raisen",
            "Rajgarh",
            "Ratlam",
            "Rewa",
            "Sagar",
            "Satna",
            "Sehore",
            "Seoni",
            "Shahdol",
            "Shajapur",
            "Sheopur",
            "Shivpuri",
            "Sidhi",
            "Singrauli",
            "Tikamgarh",
            "Ujjain",
            "Umaria",
            "Vidisha"
        ],

        "Maharashtra": [
            "Ahmednagar",
            "Akola",
            "Amravati",
            "Aurangabad",
            "Beed",
            "Bhandara",
            "Buldhana",
            "Chandrapur",
            "Chhatrapati Sambhajinagar",
            "Dhule",
            "Gadchiroli",
            "Gondia",
            "Hingoli",
            "Jalgaon",
            "Jalna",
            "Kolhapur",
            "Latur",
            "Mumbai City",
            "Mumbai Suburban",
            "Nagpur",
            "Nanded",
            "Nandurbar",
            "Nashik",
            "Osmanabad",
            "Palghar",
            "Parbhani",
            "Pune",
            "Raigad",
            "Ratnagiri",
            "Sangli",
            "Satara",
            "Sindhudurg",
            "Solapur",
            "Thane",
            "Wardha",
            "Washim",
            "Yavatmal"
        ],

        "Manipur": [
            "Bishnupur",
            "Chandel",
            "Churachandpur",
            "Imphal East",
            "Imphal West",
            "Jiribam",
            "Kakching",
            "Kamjong",
            "Kangpokpi",
            "Noney",
            "Pherzawl",
            "Senapati",
            "Tamenglong",
            "Tengnoupal",
            "Thoubal",
            "Ukhrul"
        ],

        "Meghalaya": [
            "East Garo Hills",
            "East Jaintia Hills",
            "East Khasi Hills",
            "North Garo Hills",
            "Ri Bhoi",
            "South Garo Hills",
            "South West Garo Hills",
            "South West Khasi Hills",
            "West Garo Hills",
            "West Jaintia Hills",
            "West Khasi Hills"
        ],

        "Mizoram": [
            "Aizawl",
            "Champhai",
            "Hnahthial",
            "Khawzawl",
            "Kolasib",
            "Lawngtlai",
            "Lunglei",
            "Mamit",
            "Saiha",
            "Saitual",
            "Serchhip"
        ],

        "Nagaland": [
            "Chumoukedima",
            "Dimapur",
            "Kiphire",
            "Kohima",
            "Longleng",
            "Mokokchung",
            "Mon",
            "Niuland",
            "Noklak",
            "Peren",
            "Phek",
            "Shamator",
            "Tseminyu",
            "Tuensang",
            "Wokha",
            "Zunheboto"
        ],

        "Odisha": [
            "Angul",
            "Balangir",
            "Balasore",
            "Bargarh",
            "Bhadrak",
            "Boudh",
            "Cuttack",
            "Deogarh",
            "Dhenkanal",
            "Gajapati",
            "Ganjam",
            "Jagatsinghpur",
            "Jajpur",
            "Jharsuguda",
            "Kalahandi",
            "Kandhamal",
            "Kendrapara",
            "Kendujhar",
            "Khordha",
            "Koraput",
            "Malkangiri",
            "Mayurbhanj",
            "Nabarangpur",
            "Nayagarh",
            "Nuapada",
            "Puri",
            "Rayagada",
            "Sambalpur",
            "Subarnapur",
            "Sundargarh"
        ],

        "Punjab": [
            "Amritsar",
            "Barnala",
            "Bathinda",
            "Faridkot",
            "Fatehgarh Sahib",
            "Fazilka",
            "Ferozepur",
            "Gurdaspur",
            "Hoshiarpur",
            "Jalandhar",
            "Kapurthala",
            "Ludhiana",
            "Malerkotla",
            "Mansa",
            "Moga",
            "Pathankot",
            "Patiala",
            "Rupnagar",
            "Sahibzada Ajit Singh Nagar",
            "Sangrur",
            "Shaheed Bhagat Singh Nagar",
            "Sri Muktsar Sahib",
            "Tarn Taran"
        ],

        "Rajasthan": [
            "Ajmer",
            "Alwar",
            "Balotra",
            "Banswara",
            "Baran",
            "Barmer",
            "Beawar",
            "Bharatpur",
            "Bhilwara",
            "Bikaner",
            "Bundi",
            "Chittorgarh",
            "Churu",
            "Dausa",
            "Deeg",
            "Dholpur",
            "Didwana-Kuchamana",
            "Dungarpur",
            "Hanumangarh",
            "Jaipur",
            "Jaisalmer",
            "Jalore",
            "Jhalawar",
            "Jhunjhunu",
            "Jodhpur",
            "Karauli",
            "Khairthal-Tijara",
            "Kota",
            "Kotputli-Behror",
            "Nagaur",
            "Pali",
            "Phalodi",
            "Pratapgarh",
            "Rajsamand",
            "Salumbar",
            "Sawai Madhopur",
            "Sikar",
            "Sirohi",
            "Sri Ganganagar",
            "Tonk",
            "Udaipur"
        ],

        "Sikkim": [
            "Gangtok",
            "Gyalshing",
            "Mangan",
            "Namchi",
            "Pakyong",
            "Soreng"
        ],

        "Tamil Nadu": [
            "Ariyalur",
            "Chengalpattu",
            "Chennai",
            "Coimbatore",
            "Cuddalore",
            "Dharmapuri",
            "Dindigul",
            "Erode",
            "Kallakurichi",
            "Kancheepuram",
            "Karur",
            "Krishnagiri",
            "Madurai",
            "Mayiladuthurai",
            "Nagapattinam",
            "Namakkal",
            "Nilgiris",
            "Perambalur",
            "Pudukkottai",
            "Ramanathapuram",
            "Ranipet",
            "Salem",
            "Sivaganga",
            "Tenkasi",
            "Thanjavur",
            "Theni",
            "Thoothukudi",
            "Tiruchirappalli",
            "Tirunelveli",
            "Tirupathur",
            "Tiruppur",
            "Tiruvallur",
            "Tiruvannamalai",
            "Tiruvarur",
            "Vellore",
            "Viluppuram",
            "Virudhunagar"
        ],

        "Telangana": [
            "Adilabad",
            "Bhadradri Kothagudem",
            "Hanamkonda",
            "Hyderabad",
            "Jagtial",
            "Jangaon",
            "Jayashankar Bhupalpally",
            "Jogulamba Gadwal",
            "Kamareddy",
            "Karimnagar",
            "Khammam",
            "Komaram Bheem Asifabad",
            "Mahabubabad",
            "Mahabubnagar",
            "Mancherial",
            "Medak",
            "Medchal-Malkajgiri",
            "Mulugu",
            "Nagarkurnool",
            "Nalgonda",
            "Narayanpet",
            "Nirmal",
            "Nizamabad",
            "Peddapalli",
            "Rajanna Sircilla",
            "Rangareddy",
            "Sangareddy",
            "Siddipet",
            "Suryapet",
            "Vikarabad",
            "Wanaparthy",
            "Warangal",
            "Yadadri Bhuvanagiri"
        ],

        "Tripura": [
            "Dhalai",
            "Gomati",
            "Khowai",
            "North Tripura",
            "Sepahijala",
            "South Tripura",
            "Unakoti",
            "West Tripura"
        ],

        "Uttar Pradesh": [
            "Agra",
            "Aligarh",
            "Ambedkar Nagar",
            "Amethi",
            "Amroha",
            "Auraiya",
            "Ayodhya",
            "Azamgarh",
            "Baghpat",
            "Bahraich",
            "Ballia",
            "Balrampur",
            "Banda",
            "Barabanki",
            "Bareilly",
            "Basti",
            "Bhadohi",
            "Bijnor",
            "Budaun",
            "Bulandshahr",
            "Chandauli",
            "Chitrakoot",
            "Deoria",
            "Etah",
            "Etawah",
            "Farrukhabad",
            "Fatehpur",
            "Firozabad",
            "Gautam Buddha Nagar",
            "Ghaziabad",
            "Ghazipur",
            "Gonda",
            "Gorakhpur",
            "Hamirpur",
            "Hapur",
            "Hardoi",
            "Hathras",
            "Jalaun",
            "Jaunpur",
            "Jhansi",
            "Kannauj",
            "Kanpur Dehat",
            "Kanpur Nagar",
            "Kasganj",
            "Kaushambi",
            "Kushinagar",
            "Lakhimpur Kheri",
            "Lalitpur",
            "Lucknow",
            "Maharajganj",
            "Mahoba",
            "Mainpuri",
            "Mathura",
            "Mau",
            "Meerut",
            "Mirzapur",
            "Moradabad",
            "Muzaffarnagar",
            "Pilibhit",
            "Pratapgarh",
            "Prayagraj",
            "Raebareli",
            "Rampur",
            "Saharanpur",
            "Sambhal",
            "Sant Kabir Nagar",
            "Shahjahanpur",
            "Shamli",
            "Shravasti",
            "Siddharthnagar",
            "Sitapur",
            "Sonbhadra",
            "Sultanpur",
            "Unnao",
            "Varanasi"
        ],

        "Uttarakhand": [
            "Almora",
            "Bageshwar",
            "Chamoli",
            "Champawat",
            "Dehradun",
            "Haridwar",
            "Nainital",
            "Pauri Garhwal",
            "Pithoragarh",
            "Rudraprayag",
            "Tehri Garhwal",
            "Udham Singh Nagar",
            "Uttarkashi"
        ],

        "West Bengal": [
            "Alipurduar",
            "Bankura",
            "Paschim Bardhaman",
            "Purba Bardhaman",
            "Birbhum",
            "Cooch Behar",
            "Dakshin Dinajpur",
            "Darjeeling",
            "Hooghly",
            "Howrah",
            "Jalpaiguri",
            "Jhargram",
            "Kalimpong",
            "Kolkata",
            "Maldah",
            "Murshidabad",
            "Nadia",
            "North 24 Parganas",
            "South 24 Parganas",
            "Paschim Medinipur",
            "Purba Medinipur",
            "Uttar Dinajpur"
        ],

        "Delhi": [
            "Central Delhi",
            "East Delhi",
            "New Delhi",
            "North Delhi",
            "North East Delhi",
            "North West Delhi",
            "Shahdara",
            "South Delhi",
            "South East Delhi",
            "South West Delhi",
            "West Delhi"
        ],

        "Jammu and Kashmir": [
            "Anantnag",
            "Bandipora",
            "Baramulla",
            "Budgam",
            "Doda",
            "Ganderbal",
            "Jammu",
            "Kathua",
            "Kishtwar",
            "Kulgam",
            "Kupwara",
            "Poonch",
            "Pulwama",
            "Rajouri",
            "Ramban",
            "Reasi",
            "Samba",
            "Shopian",
            "Srinagar",
            "Udhampur"
        ],

        "Ladakh": [
            "Kargil",
            "Leh"
        ],

        "Chandigarh": [
            "Chandigarh"
        ],

        "Puducherry": [
            "Karaikal",
            "Mahe",
            "Puducherry",
            "Yanam"
        ],

        "Andaman and Nicobar Islands": [
            "Nicobars",
            "North and Middle Andaman",
            "South Andaman"
        ],

        "Dadra and Nagar Haveli and Daman and Diu": [
            "Dadra and Nagar Haveli",
            "Daman",
            "Diu"
        ],

        "Lakshadweep": [
            "Agatti",
            "Amini",
            "Andrott",
            "Bitra",
            "Chetlat",
            "Kavaratti",
            "Kadmat",
            "Kalpeni",
            "Kiltan",
            "Minicoy"
        ]

    };

const gujaratCities = {

        Ahmedabad: [
            "Ahmedabad",
            "Bavla",
            "Daskroi",
            "Dhandhuka",
            "Dholka",
            "Mandal",
            "Sanand",
            "Viramgam"
        ],

        Amreli: [
            "Amreli",
            "Babra",
            "Bagasara",
            "Dhari",
            "Jafrabad",
            "Khambha",
            "Lathi",
            "Rajula",
            "Savarkundla"
        ],

        Anand: [
            "Anand",
            "Anklav",
            "Borsad",
            "Khambhat",
            "Petlad",
            "Sojitra",
            "Tarapur",
            "Umreth"
        ],

        Aravalli: [
            "Bayad",
            "Bhiloda",
            "Dhansura",
            "Malpur",
            "Meghraj",
            "Modasa"
        ],

        Banaskantha: [
            "Amirgadh",
            "Bhabhar",
            "Danta",
            "Deesa",
            "Deodar",
            "Dhanera",
            "Kankrej",
            "Palanpur",
            "Tharad",
            "Vadgam",
            "Vav"
        ],

        Bharuch: [
            "Amod",
            "Ankleshwar",
            "Bharuch",
            "Hansot",
            "Jambusar",
            "Jhagadia",
            "Netrang",
            "Valia",
            "Vagra"
        ],

        Bhavnagar: [
            "Bhavnagar",
            "Gariadhar",
            "Ghogha",
            "Gadhada",
            "Mahuva",
            "Palitana",
            "Sihor",
            "Talaja",
            "Umrala",
            "Vallabhipur"
        ],

        Botad: [
            "Barwala",
            "Botad",
            "Gadhada",
            "Ranpur"
        ],

        "Chhota Udaipur": [
            "Bodeli",
            "Chhota Udaipur",
            "Jetpur Pavi",
            "Kavant",
            "Naswadi",
            "Sankheda"
        ],

        Dahod: [
            "Dahod",
            "Devgad Baria",
            "Dhanpur",
            "Fatepura",
            "Garbada",
            "Jhalod",
            "Limkheda",
            "Sanjeli"
        ],

        Dang: [
            "Ahwa",
            "Subir",
            "Waghai"
        ],

        "Devbhumi Dwarka": [
            "Bhanvad",
            "Dwarka",
            "Kalyanpur",
            "Khambhalia",
            "Okha"
        ],

        Gandhinagar: [
            "Dahegam",
            "Gandhinagar",
            "Kalol",
            "Mansa"
        ],

        "Gir Somnath": [
            "Gir Gadhada",
            "Kodinar",
            "Patan-Veraval",
            "Sutrapada",
            "Talala",
            "Una",
            "Veraval"
        ],

        Jamnagar: [
            "Dhrol",
            "Jamnagar",
            "Jodiya",
            "Kalavad",
            "Lalpur"
        ],

        Junagadh: [
            "Bhesan",
            "Junagadh",
            "Keshod",
            "Maliya Hatina",
            "Manavadar",
            "Mangrol",
            "Mendarda",
            "Vanthali",
            "Visavadar"
        ],

        Kheda: [
            "Balasinor",
            "Kapadvanj",
            "Kheda",
            "Mahudha",
            "Matar",
            "Mahemdavad",
            "Nadiad",
            "Thasra"
        ],

        Kutch: [
            "Abdasa",
            "Anjar",
            "Bhachau",
            "Bhuj",
            "Gandhidham",
            "Lakhpat",
            "Mandvi",
            "Mundra",
            "Nakhatrana",
            "Rapar"
        ],

        Mahisagar: [
            "Balasinor",
            "Kadana",
            "Khanpur",
            "Lunawada",
            "Santrampur",
            "Virpur"
        ],

        Mehsana: [
            "Becharaji",
            "Jotana",
            "Kadi",
            "Kheralu",
            "Mehsana",
            "Satlasana",
            "Unjha",
            "Vadnagar",
            "Vijapur",
            "Visnagar"
        ],

        Morbi: [
            "Halvad",
            "Maliya",
            "Morbi",
            "Tankara",
            "Wankaner"
        ],

        Narmada: [
            "Dediapada",
            "Garudeshwar",
            "Nandod",
            "Rajpipla",
            "Sagbara",
            "Tilakwada"
        ],

        Navsari: [
            "Bansda",
            "Bilimora",
            "Chikhli",
            "Gandevi",
            "Jalalpore",
            "Navsari",
            "Vansda"
        ],

        Panchmahal: [
            "Ghoghamba",
            "Godhra",
            "Halol",
            "Jambughoda",
            "Kalol",
            "Morwa Hadaf",
            "Shehera"
        ],

        Patan: [
            "Chanasma",
            "Harij",
            "Patan",
            "Radhanpur",
            "Sami",
            "Santalpur",
            "Siddhpur"
        ],

        Porbandar: [
            "Kutiyana",
            "Porbandar",
            "Ranavav"
        ],

        Rajkot: [
            "Dhoraji",
            "Gondal",
            "Jasdan",
            "Jetpur",
            "Kotda Sangani",
            "Lodhika",
            "Paddhari",
            "Rajkot",
            "Upleta",
            "Vinchiya"
        ],

        Sabarkantha: [
            "Himatnagar",
            "Idar",
            "Khedbrahma",
            "Poshina",
            "Prantij",
            "Talod",
            "Vadali",
            "Vijaynagar"
        ],

        Surat: [
            "Bardoli",
            "Choryasi",
            "Kamrej",
            "Mahuva",
            "Mandvi",
            "Mangrol",
            "Olpad",
            "Palsana",
            "Surat",
            "Umarpada"
        ],

        Surendranagar: [
            "Chotila",
            "Chuda",
            "Dasada",
            "Dhrangadhra",
            "Lakhtar",
            "Limbdi",
            "Muli",
            "Patdi",
            "Sayla",
            "Surendranagar",
            "Wadhwan"
        ],

        Tapi: [
            "Dolvan",
            "Nizar",
            "Songadh",
            "Uchchhal",
            "Valod",
            "Vyara"
        ],

        Vadodara: [
            "Dabhoi",
            "Karjan",
            "Padra",
            "Savli",
            "Shinor",
            "Vadodara",
            "Vaghodia"
        ],

        Valsad: [
            "Dharampur",
            "Kaprada",
            "Pardi",
            "Umbergaon",
            "Valsad",
            "Vapi"
        ]

    };

const now = new Date().toISOString();

const insert = db.prepare(`
    INSERT OR IGNORE INTO locations
    (
        id,
        name,
        city,
        state,
        country,
        status,
        created_at
    )
    VALUES (?, ?, ?, ?, 'India', 'active', ?)
`);

let inserted = 0;
let skipped = 0;
let serial = 1;

const run = db.transaction(() => {

    for (const [state, districts] of Object.entries(stateDistrictData)) {

        for (const district of districts) {

            let cities = [district];

            if (
                state === "Gujarat" &&
                Array.isArray(gujaratCities[district]) &&
                gujaratCities[district].length
            ) {
                cities = gujaratCities[district];
            }

            for (const city of cities) {

                const id =
                    "LOC" +
                    String(serial++).padStart(7, "0");

                const result = insert.run(
                    id,
                    city,
                    city,
                    state,
                    now
                );

                if (result.changes) {
                    inserted++;
                } else {
                    skipped++;
                }
            }
        }
    }
});

run();

console.log("");
console.log("==========================================");
console.log(" CA OFFICE LOCATION DATA RESTORED");
console.log("==========================================");
console.log("Inserted :", inserted);
console.log("Skipped  :", skipped);
console.log("");
console.log("State -> District -> City/Town data is ready.");
