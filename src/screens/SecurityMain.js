
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SecurityMain = () => {
    const [enteredCode, setEnteredCode] = useState('');
    const [isCodeCorrect, setIsCodeCorrect] = useState(null);
    const [numberArrayL, setNumberArrayL] = useState(null);
    const [localApartmentData, setLocalApartmentData] = useState(null);
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestPurpose, setGuestPurpose] = useState("");
    const [guestFlat, setGuestFlat] = useState("");
    const [resultData, setResultData] = useState([]);

    const handleInputCode = (code) => {
        setEnteredCode(Number(code));
    }

    useEffect(() => {
        const fetchResultData = async () => {
            try {
                const unsubscribe = firestore().collection('result').onSnapshot((querySnapshot) => {
                    const updatedResultData = [];
                    querySnapshot.forEach((doc) => {
                        const result = doc.data();
                        updatedResultData.push(result);
                    });
                    setResultData(updatedResultData);
                });
                return unsubscribe;
            } catch (error) {
                console.error('Error fetching result data:', error);
            }
        };

        fetchResultData();
    }, []);


    useEffect(() => {

        const fetchData = async () => {
            try {
                const snapshot = await firestore().collection('Codes').get();
                const filteredCodes = [];
                const allCodes = [];

                snapshot.forEach(doc => {
                    const codeData = doc.data();
                    allCodes.push(codeData.code);

                    if (codeData.selectedApartment === localApartmentData) {
                        filteredCodes.push(codeData.code);
                        console.log(codeData.selectedApartment, localApartmentData)
                        setNumberArrayL(filteredCodes);
                    }
                });

                console.log(filteredCodes, "Selected OTPs");
                console.log(allCodes, "All available OTPs");
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [localApartmentData]);


    useEffect(() => {
        const getSelectedApartment = async () => {
            try {
                const selectedApartment = await AsyncStorage.getItem('SELECTEDAPARTMENT');

                if (selectedApartment !== null) {
                    console.log('Selected Apartment:', selectedApartment);
                    setLocalApartmentData(selectedApartment);
                } else {
                    console.log('Selected Apartment not found in AsyncStorage.');
                }
            } catch (error) {
                console.error('Error retrieving selected apartment:', error);
            }
        };
        getSelectedApartment();
    }, []);
    const filteredResultData = resultData.filter(item => !item.handled);
    
    const handleOkayButtonPress = async (itemName) => {
        try {
            const docRef = firestore().collection('result').doc(itemName);
            await docRef.update({ handled: true });
            console.log(`Item ${itemName} marked as handled.`);
        } catch (error) {
            console.error('Error marking item as handled:', error);
        }
    };
    const handleVerifyCode = async () => {
        if (numberArrayL.includes(enteredCode)) {
            console.log("Allow");
            setIsCodeCorrect(true);
            try {
                const snapshot = await firestore().collection('Codes').where('code', '==', enteredCode).get();
                snapshot.forEach(doc => {
                    doc.ref.delete();
                    console.log('Document deleted:', doc.id);
                });
            } catch (error) {
                console.error('Error deleting document:', error);
            }
        } else {
            setIsCodeCorrect(false);
            console.log("Reject");
        }
    };

    const sendVisitorRequest = async () => {
        try {
            const residentDataSnapshot = await firestore().collection('users')
                .where('flatID', '==', guestFlat)
                .where('selectedApartment', '==', localApartmentData)
                .get();

            if (!residentDataSnapshot.empty) {
                const residentDoc = residentDataSnapshot.docs[0];
                const residentData = residentDoc.data();

                const formData = {
                    guestName,
                    guestPhone,
                    guestPurpose,
                };

                residentData.formData = formData;

                await residentDoc.ref.update({ formData });


                console.log('Form data sent to resident and saved in the Firestore document:', residentData);
            } else {
                console.log('Resident not found for the given flat number and apartment.');
            }
        } catch (error) {
            console.error('Error sending form data:', error);
        }
    };

    console.log(enteredCode)

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Security Check</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter code"
                    value={enteredCode}
                    onChangeText={handleInputCode}
                />
                <TouchableOpacity style={styles.okButton} onPress={handleVerifyCode}>
                    <Text style={styles.okButtonText}>OK</Text>
                </TouchableOpacity>
            </View>

            {isCodeCorrect !== null && (
                <View style={[styles.resultContainer, isCodeCorrect ? styles.resultCorrect : styles.resultIncorrect]}>
                    <Text style={styles.resultText}>{isCodeCorrect ? 'Allowed' : 'Rejected'}</Text>
                </View>
            )}
            <View>
                <Text style={{ fontSize: 20, marginTop: "20%", marginLeft: "15%", fontWeight: 'bold', color: "black" }}> Incoming Request </Text>
                <TextInput
                    placeholder="Enter Guest Name"
                    style={[styles.inputForm, { marginTop: 20 }]}
                    value={guestName}
                    onChangeText={txt => setGuestName(txt)}
                />
                <TextInput
                    placeholder="Enter Guest Phone Number"
                    style={[styles.inputForm, { marginTop: 20 }]}
                    value={guestPhone}
                    onChangeText={txt => setGuestPhone(txt)}
                />
                <TextInput
                    placeholder="Enter Guest Purpose"
                    style={[styles.inputForm, { marginTop: 20 }]}
                    value={guestPurpose}
                    onChangeText={txt => setGuestPurpose(txt)}
                />
                <TextInput
                    placeholder="Enter Guest Flat No"
                    style={[styles.inputForm, { marginTop: 20 }]}
                    value={guestFlat}
                    onChangeText={txt => setGuestFlat(txt)}
                />

                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={sendVisitorRequest}
                >
                    <Text style={styles.sendButtonText}>Send Request</Text>
                </TouchableOpacity>

            </View>
            {filteredResultData.length > 0 && (
                <Text style={{ fontSize: 20, marginTop: '5%', fontWeight: 'bold', color: 'black' }}>
                    Incoming Requests
                </Text>
            )}
            <FlatList
                data={filteredResultData}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={styles.resultItemContainer}>
                        <Text style={[styles.resultText, { color: item.response === 'Accepted' ? 'green' : 'red' }]}>
                            {item.name} - {item.response}
                        </Text>
                        {!item.handled && (
                            <TouchableOpacity
                                style={styles.okayButton}
                                onPress={() => handleOkayButtonPress(item.name)}
                            >
                                <Text style={styles.okayButtonText}>Okay</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />
        </View>
    );
};

export default SecurityMain;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    inputForm: {
        minWidth: "90%",
        height: 50,
        borderWidth: 0.5,
        borderRadius: 10,
        alignSelf: 'center',
        paddingLeft: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        height: 40,
        width: 200,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 5,
    },
    inputCorrect: {
        backgroundColor: 'green',
    },
    inputIncorrect: {
        backgroundColor: 'red',
    },
    okButton: {
        backgroundColor: 'blue',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginLeft: 10,
    },
    okButtonText: {
        color: 'white',
        fontSize: 16,
    },
    resultContainer: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    resultCorrect: {
        backgroundColor: 'green',
    },
    resultIncorrect: {
        backgroundColor: 'red',
    },
    resultText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sendButton: {
        backgroundColor: 'blue',
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
    },
    resultItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    resultText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    okayButton: {
        backgroundColor: 'blue',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    okayButtonText: {
        color: 'white',
        fontSize: 12,
    },
});